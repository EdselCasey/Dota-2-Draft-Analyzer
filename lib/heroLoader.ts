import fs from 'fs'
import path from 'path'
import type { HeroProfile, TaggedAbility, AbilityTag } from './types'
import { buildHeroProfile } from './scorer'

const HERO_TAGS_DIR = path.join(process.cwd(), 'data', 'hero_tags')

// ── Tag file format ───────────────────────────────────────────────────────────
// Format: { "ability_name": ["tag1", "tag2"] }

type ManualFile = Record<string, AbilityTag[]>

function loadTagFile(heroName: string): ManualFile | null {
  const filePath = path.join(HERO_TAGS_DIR, `${heroName}.json`)
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ManualFile
  } catch {
    return null
  }
}

function buildTaggedAbilities(tagFile: ManualFile): TaggedAbility[] {
  const result: TaggedAbility[] = []
  for (const [name, tags] of Object.entries(tagFile)) {
    // Support both old format (array) and new format (object with tags key)
    const tagArr = Array.isArray(tags) ? tags : (tags as unknown as { tags: AbilityTag[] }).tags ?? []
    if (tagArr.length === 0) continue
    result.push({ name, tags: tagArr })
  }
  return result
}

// ── Loader ────────────────────────────────────────────────────────────────────

let _cache: Map<string, HeroProfile> | null = null

export function loadAllHeroes(): Map<string, HeroProfile> {
  if (process.env.NODE_ENV === 'production' && _cache) return _cache

  const heroNames = fs.readdirSync(HERO_TAGS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))

  const profiles = new Map<string, HeroProfile>()
  for (const heroName of heroNames) {
    const tagFile = loadTagFile(heroName)
    if (!tagFile) continue
    const tagged = buildTaggedAbilities(tagFile)
    profiles.set(heroName, buildHeroProfile(heroName, tagged))
  }

  _cache = profiles
  return profiles
}

export function invalidateCache(): void {
  _cache = null
}

export function getHeroProfile(name: string): HeroProfile | undefined {
  return loadAllHeroes().get(name)
}

export function resolveHeroes(names: string[]): HeroProfile[] {
  const all = loadAllHeroes()
  return names.flatMap(n => {
    const p = all.get(n)
    if (!p) {
      console.warn(`[heroLoader] Unknown hero: "${n}"`)
      return []
    }
    return [p]
  })
}

export function candidatePool(excludedNames: string[]): HeroProfile[] {
  const all = loadAllHeroes()
  const excluded = new Set(excludedNames)
  return Array.from(all.values()).filter(h => !excluded.has(h.name))
}
