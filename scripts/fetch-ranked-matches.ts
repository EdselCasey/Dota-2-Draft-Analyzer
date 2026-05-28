/**
 * Fetches recent ranked public match IDs from OpenDota and writes them to
 * scripts/match-ids-ranked.txt for batch analysis against mid/high-elo games.
 *
 * Usage:
 *   npm run fetch:ranked
 *
 * Configuration via env vars:
 *   FETCH_MATCH_COUNT   (default: 300)
 *   FETCH_MIN_AVG_MMR   (default: 3500)
 *   FETCH_MAX_AVG_MMR   (default: 8000)
 *
 * Output:
 *   scripts/match-ids-ranked.txt — one match ID per line
 */

import fs from 'node:fs'
import path from 'node:path'

const TARGET_COUNT = parseInt(process.env.FETCH_MATCH_COUNT ?? '300', 10)
const MIN_AVG_MMR  = parseInt(process.env.FETCH_MIN_AVG_MMR ?? '3500', 10)
const MAX_AVG_MMR  = parseInt(process.env.FETCH_MAX_AVG_MMR ?? '8000', 10)
const OUTPUT_PATH  = path.join(process.cwd(), 'scripts', 'match-ids-ranked.txt')
const RATE_DELAY   = 1200

type PublicMatch = {
  match_id: number
  avg_mmr: number | null
  lobby_type: number
  game_mode: number
  duration: number
}

async function fetchPublicMatches(lessThanMatchId?: number): Promise<PublicMatch[]> {
  const url = new URL('https://api.opendota.com/api/publicMatches')
  if (lessThanMatchId) url.searchParams.set('less_than_match_id', String(lessThanMatchId))

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Dota2DraftAnalyzer',
    },
  })

  if (!res.ok) {
    throw new Error(`OpenDota API error ${res.status}: ${await res.text()}`)
  }

  return (await res.json()) as PublicMatch[]
}

async function main() {
  console.log(
    `Fetching ranked public matches (target: ${TARGET_COUNT}, avg_mmr: ${MIN_AVG_MMR}-${MAX_AVG_MMR})`
  )

  const matchIds = new Set<number>()
  let cursor: number | undefined
  let page = 0

  while (matchIds.size < TARGET_COUNT) {
    page++
    const matches = await fetchPublicMatches(cursor)
    if (matches.length === 0) break

    let addedThisPage = 0

    for (const match of matches) {
      cursor = match.match_id

      const avgMmr = match.avg_mmr ?? 0
      const isRankedLobby = match.lobby_type === 7
      const isLongEnough = match.duration >= 900

      if (!isRankedLobby || !isLongEnough) continue
      if (avgMmr < MIN_AVG_MMR || avgMmr > MAX_AVG_MMR) continue

      matchIds.add(match.match_id)
      addedThisPage++

      if (matchIds.size >= TARGET_COUNT) break
    }

    console.log(`  Page ${page}: +${addedThisPage} matches (total ${matchIds.size})`)
    await new Promise(r => setTimeout(r, RATE_DELAY))
  }

  const ids = Array.from(matchIds).sort((a, b) => b - a)
  fs.writeFileSync(OUTPUT_PATH, ids.join('\n') + '\n')
  console.log(`\nWrote ${ids.length} ranked match IDs to ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})