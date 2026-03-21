import fs from 'fs'
import path from 'path'
import type { HeroProfile, CleanedAbility, TaggedAbility, AbilityTag, TagProps } from './types'
import { tagHero, extractMaxDamage } from './tagger'
import { buildHeroProfile } from './scorer'
import { extractAllProps, buildGlobalNorms, type GlobalPropNorms } from './tagProps'

const HEROES_DIR   = path.join(process.cwd(), 'data', 'heroes_clean')
const HERO_TAGS_DIR = path.join(process.cwd(), 'data', 'hero_tags')

// ── Manual tag file types ─────────────────────────────────────────────────────
// Old format: { "ability_name": ["tag1", "tag2"] }
// New format: { "ability_name": { "tags": ["tag1"], "props": { "stun": { duration: 2 } } } }

type OldManualEntry  = AbilityTag[]
type NewManualEntry  = { tags: AbilityTag[]; props?: Partial<Record<AbilityTag, TagProps>> }
type ManualFileEntry = OldManualEntry | NewManualEntry
type ManualFile      = Record<string, ManualFileEntry>

function normalizeManualEntry(entry: ManualFileEntry): NewManualEntry {
  if (Array.isArray(entry)) return { tags: entry }
  return entry
}

function loadManualTags(heroName: string): ManualFile | null {
  const filePath = path.join(HERO_TAGS_DIR, `${heroName}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ManualFile
  } catch {
    return null
  }
}

function buildTaggedFromManual(
  abilities: Record<string, CleanedAbility>,
  manual: ManualFile
): TaggedAbility[] {
  const result: TaggedAbility[] = []

  for (const [name, rawEntry] of Object.entries(manual)) {
    const { tags, props: manualProps } = normalizeManualEntry(rawEntry)
    if (tags.length === 0) continue

    const ability = abilities[name]

    const autoProps = ability ? extractAllProps(tags, ability) : {}
    const mergedProps: Partial<Record<AbilityTag, TagProps>> = { ...autoProps, ...manualProps }

    const isBurst = tags.includes('burst') || tags.includes('aoe_damage')

    const ta: TaggedAbility = {
      name,
      tags,
      ...(isBurst && ability ? { damageMagnitude: extractMaxDamage(ability.effects) } : {}),
      ...(Object.keys(mergedProps).length > 0 ? { props: mergedProps } : {}),
    }

    result.push(ta)
  }

  return result
}

// ── Loader ────────────────────────────────────────────────────────────────────

let _cache: Map<string, HeroProfile> | null = null

export function loadAllHeroes(): Map<string, HeroProfile> {
  if (process.env.NODE_ENV === 'production' && _cache) return _cache

  // ── Pass 1: collect tagged abilities for every hero ───────────────────────
  const heroAbilities = new Map<string, TaggedAbility[]>()
  const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const heroName = file.replace('.json', '')
    const raw = fs.readFileSync(path.join(HEROES_DIR, file), 'utf-8')
    const abilities = JSON.parse(raw) as Record<string, CleanedAbility>

    const manual = loadManualTags(heroName)
    let tagged: TaggedAbility[]

    if (manual) {
      tagged = buildTaggedFromManual(abilities, manual)
    } else {
      // Auto-tagger path: also extract props from heroes_clean
      tagged = tagHero(abilities).map(ta => ({
        ...ta,
        props: extractAllProps(ta.tags, abilities[ta.name] ?? ({} as CleanedAbility)),
      }))
    }

    heroAbilities.set(heroName, tagged)
  }

  // ── Pass 2: build global norms from all abilities ─────────────────────────
  const allAbilities = [...heroAbilities.values()].flat()
  const norms: GlobalPropNorms = buildGlobalNorms(allAbilities)

  // ── Pass 3: build hero profiles with normalised scoring ───────────────────
  const profiles = new Map<string, HeroProfile>()

  for (const [heroName, tagged] of heroAbilities) {
    const profile = buildHeroProfile(heroName, tagged, norms)
    profiles.set(heroName, profile)
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
