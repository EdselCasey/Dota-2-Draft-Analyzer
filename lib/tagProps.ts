import type { AbilityTag, CleanedAbility, TaggedAbility, TagProps } from './types'

// ── Schema: which props apply to each tag ────────────────────────────────────

export const TAG_PROP_SCHEMA: Partial<Record<AbilityTag, (keyof TagProps)[]>> = {
  burst:            ['damage', 'range', 'cooldown'],
  aoe_damage:       ['damage', 'range', 'radius', 'cooldown'],
  dps:              ['damage', 'duration', 'cooldown'],
  heal:             ['heal_amount', 'hps', 'cooldown'],
  blink:            ['range', 'cooldown'],
  dash:             ['range', 'cooldown'],
  teleport:         ['cooldown','range'],
  stun:             ['duration', 'range', 'cooldown'],
  root:             ['duration', 'range', 'cooldown'],
  silence:          ['duration', 'range', 'cooldown'],
  hex:              ['duration', 'range', 'cooldown'],
  slow:             ['duration', 'range', 'cooldown'],
  forced_movement:  ['range', 'cooldown'],
  disarm:           ['duration', 'range', 'cooldown'],
  banish:           ['duration', 'range', 'cooldown'],
  leash:           ['duration', 'range', 'cooldown']
}

// The single "most important" prop for scaling a tag's contribution.
// If undefined, no prop-scaling is applied (factor = 1.0).
export const TAG_PRIMARY_PROP: Partial<Record<AbilityTag, keyof TagProps>> = {
  burst:            'damage',
  aoe_damage:       'damage',
  dps:              'damage',
  heal:             'heal_amount',
  blink:            'range',
  dash:             'range',
  stun:             'duration',
  root:             'duration',
  silence:          'duration',
  hex:              'duration',
  slow:             'duration',
  forced_movement:  'range',
  disarm:           'duration',
  banish:           'cooldown',
  leash:           'cooldown',
}

// Props where a LOWER value means STRONGER (e.g. short cooldown = more uptime)
const LOWER_IS_BETTER = new Set<keyof TagProps>(['cooldown'])

// ── Extraction helpers ────────────────────────────────────────────────────────

function toMaxNumber(val: number | number[] | string): number | undefined {
  if (typeof val === 'number') return val > 0 ? val : undefined
  if (Array.isArray(val) && val.length > 0) {
    const m = Math.max(...(val as number[]))
    return m > 0 ? m : undefined
  }
  return undefined
}

function findMax(
  fx: Record<string, number | number[] | string>,
  keys: string[]
): number | undefined {
  let best: number | undefined
  for (const key of keys) {
    const n = toMaxNumber(fx[key])
    if (n !== undefined && (best === undefined || n > best)) best = n
  }
  return best
}

/** Extract numeric props for a specific tag from a CleanedAbility. */
export function extractPropsForTag(tag: AbilityTag, ability: CleanedAbility): TagProps {
  const props: TagProps = {}
  const fx = ability.effects

  if (tag === 'burst' || tag === 'aoe_damage') {
    const dmg = findMax(fx, [
      'damage', 'spell_damage', 'damage_per_hit',
      'activation_damage', 'initial_damage',
    ])
    if (dmg !== undefined) props.damage = dmg
    if (ability.castRange > 0) props.range = ability.castRange
    if (tag === 'aoe_damage') {
      const r = findMax(fx, ['radius', 'aoe_radius', 'explosion_radius', 'area_of_effect'])
      if (r !== undefined) props.radius = r
    }
  }

  if (tag === 'dps') {
    const hps = findMax(fx, [
      'damage_per_second', 'dps', 'damage_per_tick',
      'burn_dps', 'damage_per_interval', 'damage_per_second_fire',
    ])
    const dur = findMax(fx, ['duration', 'linger_duration', 'effect_duration', 'burn_duration'])
    if (dur !== undefined) props.duration = dur
  }

  if (tag === 'heal') {
    const ha = findMax(fx, [
      'heal', 'heal_amount', 'base_heal', 'health_restore',
      'heal_per_second', 'hps',
    ])
    if (ha !== undefined) props.heal_amount = ha
    const hps = findMax(fx, ['heal_per_second', 'hps', 'regen_per_second'])
    if (hps !== undefined) props.hps = hps
  }

  if (['stun', 'root', 'silence', 'hex', 'slow', 'forced_movement', 'disarm'].includes(tag)) {
    const dur = findMax(fx, [
      'duration', 'stun_duration', 'root_duration', 'silence_duration',
      'hex_duration', 'sleep_duration', 'slow_duration', 'disable_duration',
      'disarm_duration', 'fear_duration',
    ])
    if (dur !== undefined) props.duration = dur
    if (ability.castRange > 0) props.range = ability.castRange
  }

  if (tag === 'blink' || tag === 'dash') {
    const r = findMax(fx, ['blink_range', 'blink_distance', 'range', 'max_range', 'dash_range'])
    if (r !== undefined) props.range = r
    else if (ability.castRange > 0) props.range = ability.castRange
  }

  // Always capture cooldown for any tag that has a schema entry
  if (TAG_PROP_SCHEMA[tag] && ability.cooldown.length > 0) {
    props.cooldown = ability.cooldown[0]
  }

  return props
}

/** Auto-extract props for all tags present on a TaggedAbility. */
export function extractAllProps(
  tags: AbilityTag[],
  ability: CleanedAbility
): Partial<Record<AbilityTag, TagProps>> {
  const result: Partial<Record<AbilityTag, TagProps>> = {}
  for (const tag of tags) {
    if (!TAG_PROP_SCHEMA[tag]) continue
    const props = extractPropsForTag(tag, ability)
    if (Object.keys(props).length > 0) result[tag] = props
  }
  return result
}

// ── Global normalization ──────────────────────────────────────────────────────

export interface PropNormRange {
  min: number
  max: number
}

/** key: `tag:prop`, e.g. "stun:duration" */
export type GlobalPropNorms = Map<string, PropNormRange>

export function buildGlobalNorms(allAbilities: TaggedAbility[]): GlobalPropNorms {
  const norms = new Map<string, PropNormRange>()

  for (const ability of allAbilities) {
    if (!ability.props) continue
    for (const [tag, tagProps] of Object.entries(ability.props) as [AbilityTag, TagProps][]) {
      for (const [prop, val] of Object.entries(tagProps) as [keyof TagProps, number][]) {
        if (typeof val !== 'number' || val <= 0) continue
        const key = `${tag}:${prop}`
        const existing = norms.get(key)
        if (!existing) {
          norms.set(key, { min: val, max: val })
        } else {
          existing.min = Math.min(existing.min, val)
          existing.max = Math.max(existing.max, val)
        }
      }
    }
  }

  return norms
}

/**
 * Returns a multiplier in [0.5, 1.5] based on how the ability's primary prop
 * compares to the global range for that tag.
 * Falls back to 1.0 when props/norms are absent or the range collapses.
 */
export function propScaleFactor(
  tag: AbilityTag,
  props: TagProps | undefined,
  norms: GlobalPropNorms
): number {
  const primaryProp = TAG_PRIMARY_PROP[tag]
  if (!primaryProp || !props) return 1.0

  const val = props[primaryProp]
  if (val === undefined || val <= 0) return 1.0

  const normKey = `${tag}:${primaryProp}`
  const range = norms.get(normKey)
  if (!range || range.max === range.min) return 1.0

  const t = (val - range.min) / (range.max - range.min)
  const normalized = LOWER_IS_BETTER.has(primaryProp) ? 1 - t : t

  // [0.5 … 1.5] — weak abilities are 0.5×, strong ones 1.5×
  return 0.5 + normalized
}
