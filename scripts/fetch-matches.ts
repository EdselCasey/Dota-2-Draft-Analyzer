/**
 * Fetches recent pro match IDs from Stratz and writes them to scripts/match-ids.txt
 *
 * Usage:
 *   npm run fetch:matches
 *
 * Configuration via env vars:
 *   STRATZ_API_KEY       (required)
 *   FETCH_MATCH_COUNT    (default: 300)
 *   FETCH_LEAGUE_TIER    (default: PROFESSIONAL,PREMIUM,INTERNATIONAL)
 *
 * Output:
 *   scripts/match-ids.txt — one match ID per line
 */

import fs from 'node:fs'
import path from 'node:path'

// Load .env.local manually if it exists (no dotenv dependency)
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

// ── Config ────────────────────────────────────────────────────────────────────
const API_KEY      = process.env.STRATZ_API_KEY ?? ''
const TARGET_COUNT = parseInt(process.env.FETCH_MATCH_COUNT ?? '300', 10)
const TIERS        = (process.env.FETCH_LEAGUE_TIER ?? 'PROFESSIONAL,MAJOR,INTERNATIONAL,DPC_LEAGUE,DPC_LEAGUE_FINALS').split(',')
const ENDPOINT     = 'https://api.stratz.com/graphql'
const OUTPUT_PATH  = path.join(process.cwd(), 'scripts', 'match-ids.txt')
const RATE_DELAY   = 300 // ms between requests (Bronze tier: 250/min)

if (!API_KEY) {
  console.error('Error: STRATZ_API_KEY environment variable is not set.')
  console.error('Add it to .env.local or set it before running:')
  console.error('  $env:STRATZ_API_KEY="your_key_here"')
  process.exit(1)
}

// ── GraphQL ───────────────────────────────────────────────────────────────────
async function gqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRATZ_API_KEY}`,
      'User-Agent': 'STRATZ_API',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`Stratz API error ${res.status}: ${await res.text()}`)
  }

  const json = await res.json()
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`)
  }
  return json.data as T
}

// Query leagues by tier and pull their recent matches
const LEAGUES_QUERY = `
  query Leagues($tiers: [LeagueTier]) {
    leagues(request: { tiers: $tiers, take: 30 }) {
      id
      displayName
      tier
    }
  }
`

const LEAGUE_MATCHES_QUERY = `
  query LeagueMatches($leagueId: Int!, $take: Int!, $skip: Int!) {
    league(id: $leagueId) {
      matches(request: { take: $take, skip: $skip, isParsed: true }) {
        id
        durationSeconds
      }
    }
  }
`

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Fetching match IDs from Stratz (target: ${TARGET_COUNT}, tiers: ${TIERS.join(',')})`)

  // 1. Get recent leagues at the target tiers
  const leaguesData = await gqlRequest<{ leagues: { id: number; displayName: string; tier: string }[] }>(
    LEAGUES_QUERY,
    { tiers: TIERS }
  )

  const leagues = leaguesData.leagues ?? []
  console.log(`Found ${leagues.length} leagues:`)
  for (const l of leagues.slice(0, 10)) {
    console.log(`  - ${l.displayName} (${l.tier}, id=${l.id})`)
  }
  if (leagues.length > 10) console.log(`  ... and ${leagues.length - 10} more`)

  // 2. Pull matches from each league until we hit TARGET_COUNT
  const matchIds = new Set<number>()
  for (const league of leagues) {
    if (matchIds.size >= TARGET_COUNT) break

    let skip = 0
    const take = 50
    let leagueMatches = 0

    while (matchIds.size < TARGET_COUNT) {
      try {
        const data = await gqlRequest<{ league: { matches: { id: number; durationSeconds: number }[] } | null }>(
          LEAGUE_MATCHES_QUERY,
          { leagueId: league.id, take, skip }
        )

        const matches = data.league?.matches ?? []
        if (matches.length === 0) break

        for (const m of matches) {
          // Filter out very short matches (<15min) — likely abandons/concedes
          if (m.durationSeconds < 900) continue
          matchIds.add(m.id)
          leagueMatches++
          if (matchIds.size >= TARGET_COUNT) break
        }

        skip += take
        await new Promise(r => setTimeout(r, RATE_DELAY))
      } catch (err) {
        console.warn(`  Error fetching matches for league ${league.displayName}: ${(err as Error).message}`)
        break
      }
    }

    console.log(`  ${league.displayName}: +${leagueMatches} matches (total ${matchIds.size})`)
    await new Promise(r => setTimeout(r, RATE_DELAY))
  }

  // 3. Write to file
  const ids = Array.from(matchIds).sort((a, b) => b - a) // newest first
  fs.writeFileSync(OUTPUT_PATH, ids.join('\n') + '\n')
  console.log(`\nWrote ${ids.length} match IDs to ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
