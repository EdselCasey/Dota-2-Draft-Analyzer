/**
 * Batch analyzer — feeds match IDs through analyzeMatchup and writes results to CSV.
 *
 * Usage:
 *   npm run analyze:batch
 *
 * Input:
 *   scripts/match-ids.txt — one match ID per line
 *
 * Output:
 *   scripts/results.csv — one row per match
 *
 * Configuration via env vars:
 *   STRATZ_API_KEY (required)
 *   BATCH_INPUT_FILE (optional, default: scripts/match-ids.txt)
 */

import fs from 'node:fs'
import path from 'node:path'
import { resolveHeroes } from '../lib/heroLoader'
import { buildTeamProfile } from '../lib/scorer'
import { analyzeMatchup } from '../lib/matchup'
import { HERO_ID_MAP } from '../lib/heroIdMap'
import { ALL_DIMENSIONS } from '../lib/types'

// ── Config ────────────────────────────────────────────────────────────────────
const ENDPOINT    = 'https://api.stratz.com/graphql'
const RATE_DELAY  = 300 // ms between requests (Bronze tier: 250/min)
const INPUT_PATH  = process.env.BATCH_INPUT_FILE
  ? path.resolve(process.cwd(), process.env.BATCH_INPUT_FILE)
  : path.join(process.cwd(), 'scripts', 'match-ids.txt')
const OUTPUT_PATH = path.join(process.cwd(), 'scripts', 'results.csv')

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath) && !process.env.STRATZ_API_KEY) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const m = line.match(/^STRATZ_API_KEY=(.+)$/)
    if (m) {
      process.env.STRATZ_API_KEY = m[1].trim().replace(/^"|"$/g, '')
      break
    }
  }
}

const API_KEY = process.env.STRATZ_API_KEY ?? ''
if (!API_KEY) {
  console.error('Error: STRATZ_API_KEY environment variable is not set.')
  process.exit(1)
}

// ── Stratz match query ────────────────────────────────────────────────────────
const MATCH_QUERY = `
  query Match($id: Long!) {
    match(id: $id) {
      id
      didRadiantWin
      durationSeconds
      gameVersionId
      league { displayName tier }
      players {
        heroId
        isRadiant
      }
    }
  }
`

interface MatchResponse {
  match: {
    id: number
    didRadiantWin: boolean
    durationSeconds: number
    gameVersionId: number
    league: { displayName: string; tier: string } | null
    players: { heroId: number; isRadiant: boolean }[]
  } | null
}

async function fetchMatch(matchId: number): Promise<MatchResponse['match'] | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'User-Agent':    'STRATZ_API',
      },
      body: JSON.stringify({ query: MATCH_QUERY, variables: { id: matchId } }),
    })
    if (!res.ok) {
      console.warn(`  [${matchId}] HTTP ${res.status}`)
      return null
    }
    const json = await res.json()
    if (json.errors) {
      console.warn(`  [${matchId}] GraphQL error: ${JSON.stringify(json.errors)}`)
      return null
    }
    return (json.data as MatchResponse).match
  } catch (err) {
    console.warn(`  [${matchId}] Fetch error: ${(err as Error).message}`)
    return null
  }
}

// ── CSV escaping ──────────────────────────────────────────────────────────────
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// ── CSV columns ───────────────────────────────────────────────────────────────
const COLUMNS = [
  'match_id',
  'patch',
  'league',
  'tier',
  'duration_min',
  'radiant_heroes',
  'dire_heroes',
  'radiant_timing_label',
  'radiant_timing_score',
  'dire_timing_label',
  'dire_timing_score',
  'predicted_favor',
  'radiant_edge',
  'radiant_urgency_label',
  'radiant_urgency_score',
  'dire_urgency_label',
  'dire_urgency_score',
  'radiant_advantage_count',
  'radiant_critical_advantages',
  'radiant_notable_advantages',
  'radiant_vulnerability_count',
  'radiant_critical_vulnerabilities',
  'radiant_notable_vulnerabilities',
  'dire_advantage_count',
  'dire_critical_advantages',
  'dire_notable_advantages',
  'dire_vulnerability_count',
  'dire_critical_vulnerabilities',
  'dire_notable_vulnerabilities',
  'radiant_dominance_count',
  'dire_dominance_count',
  'top_radiant_advantage',
  'top_radiant_vulnerability',
  'top_dire_advantage',
  'top_dire_vulnerability',
  'predicted_winner',
  'actual_winner',
  'prediction_correct',
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────
function countBy(arr: { team: string; type: string; severity: string }[],
                 team: 'radiant' | 'dire',
                 type: 'advantage' | 'vulnerability',
                 sev?: 'critical' | 'notable' | 'minor'): number {
  return arr.filter(i => i.team === team && i.type === type && (!sev || i.severity === sev)).length
}

function topInsight(insights: any[],
                    team: 'radiant' | 'dire',
                    type: 'advantage' | 'vulnerability'): string {
  const sevWeight: Record<string, number> = { critical: 3, notable: 2, minor: 1 }
  const filtered = insights.filter(i => i.team === team && i.type === type)
  if (filtered.length === 0) return ''
  filtered.sort((a, b) => (sevWeight[b.severity] - sevWeight[a.severity]))
  const top = filtered[0]
  return `${top.ourDimension}->${top.theirDimension} (${top.severity})`
}

function dominanceCount(usNorm: Record<string, number>, themNorm: Record<string, number>): number {
  let count = 0
  for (const dim of ALL_DIMENSIONS) {
    if ((usNorm[dim] ?? 0) > (themNorm[dim] ?? 0) + 1.5) count++
  }
  return count
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`)
    console.error('Run "npm run fetch:matches" first to populate match IDs.')
    process.exit(1)
  }

  const matchIds = fs.readFileSync(INPUT_PATH, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^\d+$/.test(l))
    .map(l => parseInt(l, 10))

  if (matchIds.length === 0) {
    console.error('No valid match IDs found in input file.')
    process.exit(1)
  }

  console.log(`Analyzing ${matchIds.length} matches...`)

  // Open output stream — write header
  const out = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf-8' })
  out.write(COLUMNS.join(',') + '\n')

  let successCount = 0
  let failCount    = 0
  let correctCount = 0
  let totalEvaluated = 0
  let radiantWinCount = 0
  let direWinCount    = 0

  // Accuracy buckets by favor strength
  const buckets: Record<string, { correct: number; total: number }> = {
    strongly: { correct: 0, total: 0 },
    favored:  { correct: 0, total: 0 },
    slightly: { correct: 0, total: 0 },
    even:     { correct: 0, total: 0 },
  }

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = matchIds[i]
    process.stdout.write(`[${i + 1}/${matchIds.length}] ${matchId} ... `)

    const match = await fetchMatch(matchId)
    if (!match) {
      console.log('SKIP (fetch failed)')
      failCount++
      await new Promise(r => setTimeout(r, RATE_DELAY))
      continue
    }

    if (!match.players || match.players.length !== 10) {
      console.log('SKIP (invalid player count)')
      failCount++
      await new Promise(r => setTimeout(r, RATE_DELAY))
      continue
    }

    // Resolve heroes
    const radiantNames: string[] = []
    const direNames:    string[] = []
    for (const p of match.players) {
      const name = HERO_ID_MAP[p.heroId]
      if (!name) continue
      if (p.isRadiant) radiantNames.push(name)
      else             direNames.push(name)
    }

    if (radiantNames.length !== 5 || direNames.length !== 5) {
      console.log(`SKIP (hero resolve: r=${radiantNames.length}, d=${direNames.length})`)
      failCount++
      await new Promise(r => setTimeout(r, RATE_DELAY))
      continue
    }

    try {
      const radiantHeroes = resolveHeroes(radiantNames)
      const direHeroes    = resolveHeroes(direNames)

      if (radiantHeroes.length !== 5 || direHeroes.length !== 5) {
        console.log(`SKIP (profile resolve)`)
        failCount++
        await new Promise(r => setTimeout(r, RATE_DELAY))
        continue
      }

      const radiantTeam = buildTeamProfile(radiantHeroes)
      const direTeam    = buildTeamProfile(direHeroes)
      const matchup     = analyzeMatchup(radiantTeam, direTeam)

      // Aggregate radiant/dire timing
      const radiantTiming = radiantHeroes.reduce((s, h) => s + h.timing.score, 0) / 5
      const direTiming    = direHeroes.reduce((s, h) => s + h.timing.score, 0) / 5

      const radiantTimingLabel =
        radiantTiming <= -0.5 ? 'Early Game'   :
        radiantTiming <= -0.15 ? 'Early-Mid'    :
        radiantTiming <   0.15 ? 'Mid Game'     :
        radiantTiming <   0.5 ? 'Mid-Late'     : 'Late Game'

      const direTimingLabel =
        direTiming <= -0.5 ? 'Early Game'   :
        direTiming <= -0.15 ? 'Early-Mid'    :
        direTiming <   0.15 ? 'Mid Game'     :
        direTiming <   0.5 ? 'Mid-Late'     : 'Late Game'

      // Predicted winner
      // Normal path: use final overall favored label.
      // Special case: even matchups with one comfortable urgency path are counted
      // toward that team as a valid prediction signal.
      const favoredFromLabel =
        matchup.overallFavored === 'radiant_slightly' ||
        matchup.overallFavored === 'radiant' ||
        matchup.overallFavored === 'radiant_strongly' ? 'radiant' :
        matchup.overallFavored === 'dire_slightly' ||
        matchup.overallFavored === 'dire' ||
        matchup.overallFavored === 'dire_strongly' ? 'dire' : 'even'

      const radiantComfortableEnough = matchup.radiantUrgency.score <= 0.61
      const direComfortableEnough    = matchup.direUrgency.score <= 0.61
      const urgencyGap = Math.abs(matchup.radiantUrgency.score - matchup.direUrgency.score)
      //const evenComfortWinner =
       // favoredFromLabel !== 'even' ? 'even' :
      //  urgencyGap < 0.05 ? 'even' :
       // radiantComfortableEnough && !direComfortableEnough ? 'radiant' :
       //direComfortableEnough && !radiantComfortableEnough ? 'dire' :
        //matchup.radiantUrgency.score < matchup.direUrgency.score ? 'radiant' :
        //matchup.direUrgency.score < matchup.radiantUrgency.score ? 'dire' :
        //'even'

      const predictedWinner =
        favoredFromLabel !== 'even' ? favoredFromLabel : 'even'
        //evenComfortWinner

      const actualWinner = match.didRadiantWin ? 'radiant' : 'dire'

      const correct = predictedWinner === 'even'
        ? false  // unresolved even predictions still don't count for accuracy
        : predictedWinner === actualWinner

      if (predictedWinner !== 'even') {
        totalEvaluated++
        if (correct) correctCount++
      }

      if (actualWinner === 'radiant') radiantWinCount++
      else                            direWinCount++

      // Bucket
      const absEdge = Math.abs(matchup.radiantEdge)
      const bucket = absEdge >= 0.80 ? 'strongly' :
                     absEdge >= 0.40 ? 'favored'  :
                     absEdge >= 0.20 ? 'slightly' : 'even'
      if (predictedWinner !== 'even') {
        buckets[bucket].total++
        if (correct) buckets[bucket].correct++
      }

      // Compute team norms for dominance count
      const sharedMax = Math.max(
        ...ALL_DIMENSIONS.flatMap(d => [
          radiantTeam.rawAggregates[d] ?? 0,
          direTeam.rawAggregates[d] ?? 0,
        ]),
        1
      )
      const radiantNorm: Record<string, number> = {}
      const direNorm:    Record<string, number> = {}
      for (const d of ALL_DIMENSIONS) {
        radiantNorm[d] = ((radiantTeam.rawAggregates[d] ?? 0) / sharedMax) * 10
        direNorm[d]    = ((direTeam.rawAggregates[d]    ?? 0) / sharedMax) * 10
      }

      // Build CSV row
      const row: Record<string, unknown> = {
        match_id:       match.id,
        patch:          match.gameVersionId,
        league:         match.league?.displayName ?? '',
        tier:           match.league?.tier ?? '',
        duration_min:   Math.round(match.durationSeconds / 60),
        radiant_heroes: radiantNames.join('|'),
        dire_heroes:    direNames.join('|'),
        radiant_timing_label: radiantTimingLabel,
        radiant_timing_score: radiantTiming.toFixed(3),
        dire_timing_label:    direTimingLabel,
        dire_timing_score:    direTiming.toFixed(3),
        predicted_favor:      matchup.overallFavored,
        radiant_edge:         matchup.radiantEdge.toFixed(3),
        radiant_urgency_label: matchup.radiantUrgency.label,
        radiant_urgency_score: matchup.radiantUrgency.score,
        dire_urgency_label:    matchup.direUrgency.label,
        dire_urgency_score:    matchup.direUrgency.score,
        radiant_advantage_count:        countBy(matchup.insights, 'radiant', 'advantage'),
        radiant_critical_advantages:    countBy(matchup.insights, 'radiant', 'advantage', 'critical'),
        radiant_notable_advantages:     countBy(matchup.insights, 'radiant', 'advantage', 'notable'),
        radiant_vulnerability_count:    countBy(matchup.insights, 'radiant', 'vulnerability'),
        radiant_critical_vulnerabilities: countBy(matchup.insights, 'radiant', 'vulnerability', 'critical'),
        radiant_notable_vulnerabilities:  countBy(matchup.insights, 'radiant', 'vulnerability', 'notable'),
        dire_advantage_count:           countBy(matchup.insights, 'dire', 'advantage'),
        dire_critical_advantages:       countBy(matchup.insights, 'dire', 'advantage', 'critical'),
        dire_notable_advantages:        countBy(matchup.insights, 'dire', 'advantage', 'notable'),
        dire_vulnerability_count:       countBy(matchup.insights, 'dire', 'vulnerability'),
        dire_critical_vulnerabilities:  countBy(matchup.insights, 'dire', 'vulnerability', 'critical'),
        dire_notable_vulnerabilities:   countBy(matchup.insights, 'dire', 'vulnerability', 'notable'),
        radiant_dominance_count: dominanceCount(radiantNorm, direNorm),
        dire_dominance_count:    dominanceCount(direNorm, radiantNorm),
        top_radiant_advantage:    topInsight(matchup.insights, 'radiant', 'advantage'),
        top_radiant_vulnerability: topInsight(matchup.insights, 'radiant', 'vulnerability'),
        top_dire_advantage:       topInsight(matchup.insights, 'dire', 'advantage'),
        top_dire_vulnerability:    topInsight(matchup.insights, 'dire', 'vulnerability'),
        predicted_winner: predictedWinner,
        actual_winner:    actualWinner,
        prediction_correct: predictedWinner === 'even' ? '' : (correct ? 'Y' : 'N'),
      }

      const line = COLUMNS.map(c => csvEscape(row[c])).join(',')
      out.write(line + '\n')
      successCount++
      console.log(`OK (predicted ${predictedWinner}, actual ${actualWinner}, ${correct ? 'CORRECT' : predictedWinner === 'even' ? 'EVEN' : 'WRONG'})`)
    } catch (err) {
      console.log(`SKIP (analysis error: ${(err as Error).message})`)
      failCount++
    }

    await new Promise(r => setTimeout(r, RATE_DELAY))
  }

  out.end()

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log(`SUMMARY`)
  console.log('='.repeat(60))
  console.log(`Total matches:    ${matchIds.length}`)
  console.log(`Successful:       ${successCount}`)
  console.log(`Failed/skipped:   ${failCount}`)
  console.log(`Predictions made: ${totalEvaluated}`)
  console.log(`Correct:          ${correctCount}`)
  if (totalEvaluated > 0) {
    console.log(`Overall accuracy: ${((correctCount / totalEvaluated) * 100).toFixed(1)}%`)
  }
  console.log(`Radiant wins:     ${radiantWinCount}`)
  console.log(`Dire wins:        ${direWinCount}`)
  console.log()
  console.log('Accuracy by favor strength:')
  for (const [name, b] of Object.entries(buckets)) {
    if (b.total === 0) continue
    const pct = (b.correct / b.total) * 100
    console.log(`  ${name.padEnd(10)}: ${b.correct}/${b.total} (${pct.toFixed(1)}%)`)
  }
  console.log()
  console.log(`Results written to: ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
