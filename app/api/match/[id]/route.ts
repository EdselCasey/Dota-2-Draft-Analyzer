import { NextResponse } from 'next/server'
import { HERO_ID_MAP } from '../../../../lib/heroIdMap'

interface OpenDotaPlayer {
  hero_id: number
  player_slot: number
}

interface OpenDotaMatch {
  match_id: number
  radiant_win: boolean
  players: OpenDotaPlayer[]
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const matchId = id.trim()

  if (!/^\d+$/.test(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.opendota.com/api/matches/${matchId}`, {
      next: { revalidate: 3600 }, // cache for 1 hour
    })

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'OpenDota API error' }, { status: 502 })
    }

    const data: OpenDotaMatch = await res.json()

    const radiant: string[] = []
    const dire: string[] = []

    for (const player of data.players) {
      const heroName = HERO_ID_MAP[player.hero_id]
      if (!heroName) continue

      if (player.player_slot < 128) {
        radiant.push(heroName)
      } else {
        dire.push(heroName)
      }
    }

    return NextResponse.json({
      matchId: data.match_id,
      radiant,
      dire,
      radiantWin: data.radiant_win,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch match data' }, { status: 500 })
  }
}
