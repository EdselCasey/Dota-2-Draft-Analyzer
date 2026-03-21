import fs from 'fs'
import path from 'path'
import type { HeroProfile, TaggedAbility, AbilityTag, TagProps } from './types'
import { buildHeroProfile } from './scorer'
import { buildGlobalNorms, type GlobalPropNorms } from './tagProps'

const HERO_TAGS_DIR = path.join(process.cwd(), 'data', 'hero_tags')

// ── Tag file format ───────────────────────────────────────────────────────────
// Old format: { "ability_name": ["tag1", "tag2"] }
// New format: { "ability_name": { "tags": ["tag1"], "props": { "stun": { duration: 2 } } } }

type OldManualEntry  = AbilityTag[]
type NewManualEntry  = { tags: AbilityTag[]; props?: Partial<Record<AbilityTag, TagProps>> }
type ManualFileEntry = OldManualEntry | NewManualEntry
type ManualFile      = Record<string, ManualFileEntry>

function normalizeEntry(entry: ManualFileEntry): NewManualEntry {
  if (Array.isArray(entry)) return { tags: entry }
  return entry
}

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
  for (const [name, rawEntry] of Object.entries(tagFile)) {
    const { tags, props } = normalizeEntry(rawEntry)
    if (tags.length === 0) continue
    result.push({
      name,
      tags,
      ...(props && Object.keys(props).length > 0 ? { props } : {}),
    })
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

  // Pass 1: collect tagged abilities for every hero
  const heroAbilities = new Map<string, TaggedAbility[]>()
  for (const heroName of heroNames) {
    const tagFile = loadTagFile(heroName)
    if (!tagFile) continue
    heroAbilities.set(heroName, buildTaggedAbilities(tagFile))
  }

  // Pass 2: build global norms from all abilities for proportional scaling
  const norms: GlobalPropNorms = buildGlobalNorms([...heroAbilities.values()].flat())

  // Pass 3: build scored hero profiles
  const profiles = new Map<string, HeroProfile>()
  for (const [heroName, tagged] of heroAbilities) {
    profiles.set(heroName, buildHeroProfile(heroName, tagged, norms))
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
