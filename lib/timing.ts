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
  // Hard Control
  stun:             -0.8,
  hex:              -0.7,
  taunt:            -0.7,
  forced_movement:  -0.6,
  knockback:        -0.7,
  knockup:          -0.7,
  sleep:            -0.5,
  fear:             -0.8,

  // Soft Control
  root:             -0.7,
  silence:          -0.8,
  slow:             -0.6,
  disarm:           -0.6,
  antiheal:         -0.4,
  banish:           -0.3,
  leash:            -0.6,

  // Reach
  short_range:       0.0,
  medium_range:     -0.1,
  long_range:       -0.3,
  global:           -0.2,

  // Waveclear
  low_burst:        -1.0,
  medium_burst:     -0.8,
  high_burst:       -0.5,
  low_sustained:    -0.7,
  medium_sustained: -0.5,
  high_sustained:   -0.3,
  small_aoe:        -0.3,
  medium_aoe:        0.1,
  large_aoe:         0.4,

  // Objective Pressure
  summon_units:      0.3,
  illusion:          0.6,
  siege:             0.2,
  building_damage:   0.1,
  push_structures:   0.2,
  zone_control:     -0.2,
  bouncing_attacks:  0.4,

  // Attack Modifiers
  attack_speed_boost: -0.2,
  armor_reduction:   -0.4,
  attack_damage_boost: 0.8,
  attack_modifier:   0.7,
  mana_burn:        -0.6,

  // Duration
  short_duration:   -0.6,
  medium_duration:  -0.3,
  long_duration:     0.2,
  toggle:            0.0,

  // Cooldown
  passive:           0.0,
  short_cooldown:   -0.4,
  medium_cooldown:   0.0,
  long_cooldown:     0.4,

  // Magic
  magic_amp:        -0.8,

  // Defense / Survivability
  damage_reduction: -0.3,
  armor_gain:       -0.4,
  save:             -0.6,
  invulnerability:  -0.3,
  dispel:           -0.2,
  debuff_immunity:  -0.5,
  grant_armor:      -0.3,

  // Sustain
  low_heal:         -0.5,
  medium_heal:      -0.3,
  high_heal:        -0.1,
  low_regen:        -0.5,
  medium_regen:     -0.3,
  high_regen:        0.0,
  shield:           -0.6,
  lifesteal:         0.8,

  // Mobility
  blink:            -0.5,
  dash:             -0.4,
  movement_speed_boost: -0.5,
  escape:           -0.3,
  teleport:         -0.1,

  // Stealth / Aerial
  stealth:          -0.6,
  aerial:            0.0,
  unobstructed:      0.0,

  // Utility
  vision:           -0.3,
  mana_regen:       -0.5,
  gold_gain:        -0.6,
  xp_gain:          -0.6,
  status_resist_reduction: 0.3,
  second_life:      -0.2,
  increase_buff_duration: 0.0,
  slow_resist:      -0.3,
  cooldown_reduction: -0.2,
}

export type TimingLabel =
  | 'Early Game'
  | 'Early-Mid'
  | 'Mid Game'
  | 'Mid-Late'
  | 'Late Game'

export interface TimingResult {
  score: number      // raw weighted average, -1.0 to +1.0
  label: TimingLabel
}

const LABEL_THRESHOLDS: [number, TimingLabel][] = [
  [-0.30, 'Early Game'],
  [-0.15, 'Early-Mid'],
  [ 0.05, 'Mid Game'],
  [ 0.05, 'Mid-Late'],
  [ Infinity, 'Late Game'],
]

export const TIMING_LABEL_COLORS: Record<TimingLabel, string> = {
  'Early Game': '#f97316',   // orange
  'Early-Mid':  '#facc15',   // yellow
  'Mid Game':   '#81ee04',   // slate
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
  if (labels.length === 0) return { score: 0, label: 'Mid Game' }
  const avg = labels.reduce((s, t) => s + t.score, 0) / labels.length
  const score = Math.round(avg * 100) / 100
  const [, label] = LABEL_THRESHOLDS.find(([threshold]) => score <= threshold)!
  return { score, label }
}
