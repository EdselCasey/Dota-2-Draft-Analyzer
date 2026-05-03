import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import type { CleanedAbility, AbilityTag } from '@/lib/types'
import { tagHero } from '@/lib/tagger'
import { invalidateCache } from '@/lib/heroLoader'

const HEROES_DIR    = path.join(process.cwd(), 'data', 'heroes_clean')
const HERO_TAGS_DIR = path.join(process.cwd(), 'data', 'hero_tags')

export async function GET(): Promise<NextResponse> {
  if (!fs.existsSync(HEROES_DIR)) {
    return NextResponse.json(
      { status: 'error', message: 'heroes_clean directory not found. This route is only available in local development with Valve source data present.' },
      { status: 503 }
    )
  }

  try {
    fs.mkdirSync(HERO_TAGS_DIR, { recursive: true })

    const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'))
    const results: Record<string, { abilities: number; tags: number }> = {}

    for (const file of files) {
      const heroName = file.replace('.json', '')
      const raw = fs.readFileSync(path.join(HEROES_DIR, file), 'utf-8')
      const abilities = JSON.parse(raw) as Record<string, CleanedAbility>

      const tagged = tagHero(abilities)

      const tagMap: Record<string, AbilityTag[]> = {}
      for (const ta of tagged) {
        tagMap[ta.name] = ta.tags
      }

      const outPath = path.join(HERO_TAGS_DIR, `${heroName}.json`)
      fs.writeFileSync(outPath, JSON.stringify(tagMap, null, 2), 'utf-8')

      results[heroName] = {
        abilities: tagged.length,
        tags: tagged.reduce((s, t) => s + t.tags.length, 0),
      }
    }

    invalidateCache()

    return NextResponse.json({
      status: 'ok',
      heroesProcessed: files.length,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 }
    )
  }
}
