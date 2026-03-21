import type { HeroProfile, TeamProfile, DraftDimension } from './types'
import type { MatchupAnalysis, TeamUrgency, CounterEdge } from './matchup'
import { COUNTER_MAP, analyzeMatchup } from './matchup'
import { buildTeamProfile } from './scorer'
import { DIMENSION_LABELS } from './displayNames'
import { STRONG_THRESHOLD } from './matchupConstants'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeroRecommendation {
  hero:           HeroProfile
  score:          number   // 0–1 composite
  favorShift:     number   // how much this pick moves overall favor toward us (0–1)
  neutralizeFit:  number   // reduces enemy advantages
  weaknessFit:    number   // patches our own vulnerabilities
  timingFit:      number   // timing alignment with urgency bias
  tiltFactor:     number   // opens new edges (balanced teams only)
  reasons:        string[]
}

export interface DraftRecommendations {
  radiant: HeroRecommendation[]
  dire:    HeroRecommendation[]
}

// ── Reverse counter lookup ────────────────────────────────────────────────────

const REVERSE_COUNTER: Map<DraftDimension, { counterDim: DraftDimension; strength: number }[]> = (() => {
  const map = new Map<DraftDimension, { counterDim: DraftDimension; strength: number }[]>()
  for (const [counterDim, edges] of Object.entries(COUNTER_MAP) as [DraftDimension, CounterEdge[]][]) {
    if (!edges) continue
    for (const { counters: targetDim, strength } of edges) {
      const arr = map.get(targetDim) ?? []
      arr.push({ counterDim, strength })
      map.set(targetDim, arr)
    }
  }
  return map
})()

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

// ── Per-hero scoring ──────────────────────────────────────────────────────────

function scoreForTeam(
  hero:           HeroProfile,
  team:           TeamProfile,
  enemy:          TeamProfile,
  urgency:        TeamUrgency,
  currentMatchup: MatchupAnalysis,
  isRadiant:      boolean
): HeroRecommendation {
  const teamKey  = isRadiant ? 'radiant' : 'dire'
  const enemyKey = isRadiant ? 'dire'    : 'radiant'
  const reasons: string[] = []

  const currentEdge = currentMatchup.radiantEdge  // positive = radiant favored
  const enemyFavored =
    isRadiant ? currentMatchup.overallFavored === 'dire'
              : currentMatchup.overallFavored === 'radiant'

  // ── 1. Favor shift simulation ──────────────────────────────────────────────
  // Build a hypothetical team with this hero added and re-run the matchup.
  // Measure how much radiantEdge moves in the picking team's direction.
  const simHeroes = [...team.heroes, hero]
  const simTeam   = buildTeamProfile(simHeroes)
  const simMatchup = isRadiant
    ? analyzeMatchup(simTeam, enemy)
    : analyzeMatchup(enemy, simTeam)

  const newEdge = simMatchup.radiantEdge
  // Positive delta = shifted toward radiant. Flip sign for Dire.
  const rawDelta  = isRadiant ? (newEdge - currentEdge) : (currentEdge - newEdge)
  // Normalize: a +0.3 shift is already a big swing. Cap at 0.5 for normalization.
  const favorShift = clamp(rawDelta / 0.5, -1, 1)
  // Use only positive movement toward our favor (negative = hurts us, exclude via scoring weights)
  const favorShiftPos = clamp(favorShift, 0, 1)

  if (favorShiftPos > 0.25) {
    const simFavored = simMatchup.overallFavored
    if (simFavored === (isRadiant ? 'radiant' : 'dire')) {
      reasons.push('Swings the matchup in your favor')
    } else {
      reasons.push('Significantly improves your standing')
    }
  }

  // ── 2. Neutralize enemy advantages ────────────────────────────────────────
  const enemyAdvantages = currentMatchup.insights.filter(
    i => i.team === enemyKey && i.type === 'advantage'
  )

  let neutralizeFit = 0
  for (const adv of enemyAdvantages) {
    const severityW = adv.severity === 'critical' ? 1.0 :
                      adv.severity === 'notable'  ? 0.7 : 0.4

    const heroInWeakDim = hero.dimensionScores[adv.theirDimension] ?? 0
    const teamInWeakDim = team.aggregateScores[adv.theirDimension] ?? 0
    const coverageGap   = clamp((STRONG_THRESHOLD - teamInWeakDim) / STRONG_THRESHOLD, 0, 1)
    const pathA         = (heroInWeakDim / 10) * coverageGap

    let pathB = 0
    for (const { counterDim, strength } of REVERSE_COUNTER.get(adv.ourDimension) ?? []) {
      const heroInCounter = hero.dimensionScores[counterDim] ?? 0
      const teamInCounter = team.aggregateScores[counterDim] ?? 0
      if (teamInCounter > 8) continue
      const candidate = (heroInCounter / 10) * strength
      if (candidate > pathB) pathB = candidate
    }

    const best = Math.max(pathA, pathB)
    neutralizeFit += best * severityW

    if (best > 0.4 && adv.severity !== 'minor') {
      if (pathA >= pathB) {
        reasons.push(`Closes ${DIMENSION_LABELS[adv.theirDimension]} gap vs their ${DIMENSION_LABELS[adv.ourDimension]}`)
      } else {
        reasons.push(`Counters their ${DIMENSION_LABELS[adv.ourDimension]}`)
      }
    }
  }
  neutralizeFit = clamp(neutralizeFit / Math.max(enemyAdvantages.length, 1), 0, 1)

  // ── 3. Patch remaining vulnerabilities ────────────────────────────────────
  const vulns = currentMatchup.insights.filter(
    i => i.team === teamKey && i.type === 'vulnerability'
  )
  let weaknessFit = 0
  for (const vuln of vulns) {
    const heroScore = hero.dimensionScores[vuln.ourDimension] ?? 0
    const sevW      = vuln.severity === 'critical' ? 1.0 :
                      vuln.severity === 'notable'  ? 0.7 : 0.4
    weaknessFit += (heroScore / 10) * sevW
    if (heroScore > 5.5 && vuln.severity !== 'minor') {
      reasons.push(`Patches ${DIMENSION_LABELS[vuln.ourDimension]}`)
    }
  }
  weaknessFit = clamp(weaknessFit / Math.max(vulns.length, 1), 0, 1)

  // ── 4. Timing alignment ────────────────────────────────────────────────────
  const heroTiming = hero.timing.score
  let timingFit = 0.5
  if (urgency.recommendationBias === 'early') {
    timingFit = clamp((1 - heroTiming) / 2, 0, 1)
  } else if (urgency.recommendationBias === 'late') {
    timingFit = clamp((1 + heroTiming) / 2, 0, 1)
  }

  // ── 5. Tilt factor ────────────────────────────────────────────────────────
  // Even when already favored, score heroes that open new dominant edges.
  let tiltFactor = 0
  for (const [counterDim, edges] of Object.entries(COUNTER_MAP) as [DraftDimension, NonNullable<typeof COUNTER_MAP[DraftDimension]>][]) {
    if (!edges) continue
    const heroScore = hero.dimensionScores[counterDim] ?? 0
    if (heroScore < 6) continue
    for (const { counters: enemyDim, strength } of edges) {
      const enemyScore    = enemy.aggregateScores[enemyDim] ?? 0
      if (enemyScore < 5) continue
      if ((team.aggregateScores[counterDim] ?? 0) > 8) continue
      tiltFactor += (heroScore / 10) * strength * (enemyScore / 10)
      if (heroScore > 6.5) reasons.push(`Opens ${DIMENSION_LABELS[counterDim]} edge`)
    }
  }
  tiltFactor = clamp(tiltFactor, 0, 1)

  // ── 6. Over-stack penalty ──────────────────────────────────────────────────
  let stackPenalty = 0
  for (const dim of Object.keys(hero.dimensionScores) as DraftDimension[]) {
    if ((team.aggregateScores[dim] ?? 0) > 8 && (hero.dimensionScores[dim] ?? 0) > 6) {
      stackPenalty += 0.07
    }
  }

  // ── Composite ─────────────────────────────────────────────────────────────
  // favorShift is the primary signal — it's the real measured outcome of adding
  // this hero. The other signals act as tie-breakers and directional guides.
  //
  // When enemy favored:  favor shift + neutralize dominate (must actually flip)
  // When balanced/ahead: favor shift + tilt dominate (widen the lead)
  const fsW  = enemyFavored ? 0.45 : 0.35   // favor shift — always the top weight
  const nW   = enemyFavored ? 0.25 : 0.10
  const wW   = enemyFavored ? 0.10 : 0.15
  const tW   = enemyFavored ? 0.05 : 0.25   // tilt matters more when already ahead
  const tiW  = 0.15

  const raw   = favorShiftPos * fsW + neutralizeFit * nW + weaknessFit * wW + timingFit * tiW + tiltFactor * tW - stackPenalty
  const score = Math.round(clamp(raw, 0, 1) * 100) / 100

  return {
    hero,
    score,
    favorShift:    Math.round(favorShift    * 100) / 100,
    neutralizeFit: Math.round(neutralizeFit * 100) / 100,
    weaknessFit:   Math.round(weaknessFit   * 100) / 100,
    timingFit:     Math.round(timingFit     * 100) / 100,
    tiltFactor:    Math.round(tiltFactor    * 100) / 100,
    reasons:       [...new Set(reasons)].slice(0, 3),
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeRecommendations(
  radiant:    TeamProfile,
  dire:       TeamProfile,
  candidates: HeroProfile[],
  matchup:    MatchupAnalysis,
  topN        = 10,
  minScore    = 0.15
): DraftRecommendations {
  const rank = (isRadiant: boolean) =>
    candidates
      .map(h => scoreForTeam(
        h,
        isRadiant ? radiant : dire,
        isRadiant ? dire    : radiant,
        isRadiant ? matchup.radiantUrgency : matchup.direUrgency,
        matchup,
        isRadiant
      ))
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)

  return { radiant: rank(true), dire: rank(false) }
}
