import type { CleanedAbility, TaggedAbility } from './types'
import { inferTags } from './tagRules'

export type HeroAbilitiesMap = Record<string, CleanedAbility>

// Ability names that indicate a scepter or shard upgrade — excluded entirely
// so that only base / early-game kit is evaluated.
const UPGRADE_PATTERNS = ['_scepter', '_shard', '_aghanim']

function isScepterShardAbility(name: string): boolean {
  const lower = name.toLowerCase()
  return UPGRADE_PATTERNS.some(p => lower.endsWith(p) || lower.includes(p + '_'))
}

// Strip individual effect keys that describe scepter/shard-only values
// (e.g. scepter_slow_pct, shard_bonus_damage) so they don't influence tagging.
function stripUpgradeKeys(
  effects: CleanedAbility['effects']
): CleanedAbility['effects'] {
  return Object.fromEntries(
    Object.entries(effects).filter(([k]) => {
      const lower = k.toLowerCase()
      return !lower.startsWith('scepter') && !lower.startsWith('shard')
    })
  )
}

// Keys that carry actual nuke / damage-over-time values (not incidental "damage" substrings).
const DAMAGE_MAGNITUDE_KEYS = [
  'damage',
  'nuke_damage',
  'target_damage',
  'explosion_damage',
  'nova_damage',
  'blade_damage',
  'impact_damage',
  'pop_damage',
  'damage_per_tick',
  'damage_per_second',
  'burst_damage',
]

export function extractMaxDamage(effects: CleanedAbility['effects']): number {
  let max = 0
  for (const [k, v] of Object.entries(effects)) {
    const kl = k.toLowerCase()
    if (!DAMAGE_MAGNITUDE_KEYS.some(p => kl === p || kl.endsWith('_' + p))) continue
    const val = Array.isArray(v)
      ? Math.max(...(v as number[]))
      : typeof v === 'number'
      ? v
      : 0
    if (val > max) max = val
  }
  return max
}

export function tagHero(abilities: HeroAbilitiesMap): TaggedAbility[] {
  return Object.entries(abilities)
    .filter(([name]) => !isScepterShardAbility(name))
    .map(([name, ability]) => {
      const cleaned: CleanedAbility = {
        ...ability,
        effects: stripUpgradeKeys(ability.effects),
      }
      const tags = inferTags(name, cleaned)
      const isBurstAbility = tags.includes('low_burst') || tags.includes('medium_burst') || tags.includes('high_burst')
      const damageMagnitude = isBurstAbility ? extractMaxDamage(cleaned.effects) : undefined
      return { name, tags, damageMagnitude }
    })
    .filter(ta => ta.tags.length > 0)
}
