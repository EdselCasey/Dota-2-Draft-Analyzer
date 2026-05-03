import type { AbilityTag, TaggedAbility } from './types'

/**
 * Timing bias per tag on a -1.0 (peaks early, falls off) → +1.0 (scales late) axis.
 * 0.0 = flat / consistent across all game stages.
 *
 * Key rules:
 *   burst / aoe nukes      → negative  (punishing early when HP pools are low)
 *   spell DoT (dps)        → 0.0       (bypasses armor/resistance scaling, stays relevant)
 *   right-click modifiers  → positive  (need items/farm to come online)
 *   summons / illusions    → strong positive (exponential farm scaling)
 *   hard CC                → slightly negative (most punishing early before BKB)
 */
export const TIMING_BIAS: Partial<Record<AbilityTag, number>> = {
  // Control — slightly early-skewed (stuns punish before defensive items)
  stun:             0.2,
  root:             -0.5,
  silence:          0.0,
  hex:              0.3,
  slow:             -0.5,
  disarm:           -0.3,
  knockback:        -0.4,
  taunt:            0.2,
  forced_movement:  -0.1,
  antiheal:         -0.1,
  banish:            0.4,
  leash:            -0.2,

  // Damage pattern
  burst:            -1.0,  // hard falls off vs tankier late-game targets
  aoe_damage:       0.4,  // teamfight nukes peak mid, before BKB / dispels
  dps:               -0.5,  // spell DoT bypasses scaling — stays flat all game
  magic_amp:        -0.5,  // more effective early before magic resist stacks

  // Defense / survivability
  damage_reduction:  0.2,
  armor_gain:        -0.1,
  save:              0.0,
  invulnerability:   0.0,
  dispel:            0.4,
  debuff_immunity:   0.2,

  // Sustain
  heal:              0.3,
  shield:            -0.5,
  regen:             -0.5,
  lifesteal:         0.7,  // scales hard with attack damage

  // Mobility
  blink:             -0.5,
  dash:              -0.5,
  movement_speed_boost: 0.4,  // 
  escape:           -0.3,
  teleport:          0.4,

  // Right-click DPS — all positive (farm/item dependent)
  attack_speed_boost:  0.6,
  attack_damage_boost: 0.3,
  attack_modifier:     0.7,
  armor_reduction:     0.0,  // physical amp, better as attack damage climbs

  // Stealth / aerial
  stealth:          -0.5,  // gank/pickoff window = early-mid
  aerial:            0.2,
  unobstructed:      0.2,
  // Push / objective
  summon_units:      -0.5,  // exponential with levels and farm
  illusion:          0.8,
  siege:             0.4,
  building_damage:   0.4,
  push_structures:   0.4,
  zone_control:      0.2,

  // Utility
  vision:           0.5,  
  mana_regen:        -0.3,
  global:            0.6,  // global presence becomes more impactful late

  // Spell Uptime
  passive:           -0.6,  // always on = dominates early
  short_cooldown:    -0.4,  // frequent rotations = early tempo
  medium_cooldown:    0.1,  // slight late lean
  long_cooldown:      0.5,  // big ult reliance = needs game to reach one decisive fight
}

export type TimingLabel =
  | 'Early Game'
  | 'Early-Mid'
  | 'All Game'
  | 'Mid-Late'
  | 'Late Game'

export interface TimingResult {
  score: number      // raw weighted average, -1.0 to +1.0
  label: TimingLabel
}

const LABEL_THRESHOLDS: [number, TimingLabel][] = [
  [-0.30, 'Early Game'],
  [-0.10, 'Early-Mid'],
  [ 0.10, 'All Game'],
  [ 0.30, 'Mid-Late'],
  [ Infinity, 'Late Game'],
]

export const TIMING_LABEL_COLORS: Record<TimingLabel, string> = {
  'Early Game': '#f97316',   // orange
  'Early-Mid':  '#facc15',   // yellow
  'All Game':   '#94a3b8',   // slate
  'Mid-Late':   '#34d399',   // green
  'Late Game':  '#a78bfa',   // purple
}

export function computeTimingScore(abilities: TaggedAbility[]): TimingResult {
  let total = 0
  let count = 0

  for (const ability of abilities) {
    for (const tag of ability.tags) {
      const bias = TIMING_BIAS[tag]
      if (bias === undefined) continue
      total += bias
      count++
    }
  }

  const score = count > 0 ? total / count : 0

  const [, label] = LABEL_THRESHOLDS.find(([threshold]) => score <= threshold)!

  return { score: Math.round(score * 100) / 100, label }
}

export function teamTimingScore(labels: TimingResult[]): TimingResult {
  if (labels.length === 0) return { score: 0, label: 'All Game' }
  const avg = labels.reduce((s, t) => s + t.score, 0) / labels.length
  const score = Math.round(avg * 100) / 100
  const [, label] = LABEL_THRESHOLDS.find(([threshold]) => score <= threshold)!
  return { score, label }
}
