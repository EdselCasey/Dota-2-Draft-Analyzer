import type { AbilityTag, DraftDimension } from './types'

export interface TagWeight {
  dimension: DraftDimension
  weight: number
}

// ── AOE combo system ──────────────────────────────────────────────────────────
// When an AOE size tag is present on an ability, other tags on that ability get
// their dimension contributions multiplied by a category-based bonus. The AOE
// size determines how much to scale (small < medium < large).

export const TAG_CATEGORY: Partial<Record<AbilityTag, string>> = {
  // hard control
  stun:             'control',
  hex:              'control',
  taunt:            'control',
  forced_movement:  'control',
  knockback:        'control',
  knockup:          'control',
  sleep:            'control',
  // soft control
  root:             'control',
  silence:          'control',
  slow:             'control',
  disarm:           'control',
  antiheal:         'control',
  // damage
  low_burst:        'damage',
  medium_burst:     'damage',
  high_burst:       'damage',
  low_sustained:    'damage',
  medium_sustained: 'damage',
  high_sustained:   'damage',
  magic_amp:        'damage',
  // mobility
  blink:                 'mobility',
  dash:                  'mobility',
  movement_speed_boost:  'mobility',
  escape:                'mobility',
  teleport:              'mobility',
  // stealth
  stealth:              'stealth',
  aerial:               'aerial',
  // attack / right-click
  attack_speed_boost:   'damage',
  armor_reduction:      'damage',
  attack_damage_boost:  'damage',
  attack_modifier:      'damage',
  // objective pressure
  summon_units:     'objective_pressure',
  illusion:         'objective_pressure',
  siege:            'objective_pressure',
  building_damage:  'objective_pressure',
  push_structures:  'objective_pressure',
  zone_control:     'control',
  // defense
  damage_reduction: 'defense',
  armor_gain:       'defense',
  save:             'defense',
}

export const AOE_BONUS_BY_CATEGORY: Record<string, number> = {
  control:             1.5,
  damage:              1.3,
  mobility:            1.1,
  objective_pressure:  1.2,
  stealth:             1.2,
  aerial:              1.1,
  defense:             1.1,
}

// Derived automatically — scorer uses this for combo multiplier lookup.
export const AOE_COMBO_BONUS: Partial<Record<AbilityTag, number>> =
  Object.fromEntries(
    Object.entries(TAG_CATEGORY)
      .filter(([, cat]) => cat !== undefined && cat in AOE_BONUS_BY_CATEGORY)
      .map(([tag, cat]) => [tag, AOE_BONUS_BY_CATEGORY[cat!]])
  ) as Partial<Record<AbilityTag, number>>

// ── Main dimension mapping ─────────────────────────────────────────────────

export const TAG_DIMENSION_MAP: Record<AbilityTag, TagWeight[]> = {
  // ── Hard Control ──────────────────────────────────────────────────────────
  stun: [
    { dimension: 'hard_control', weight: 3.0 },
    { dimension: 'pickoff',      weight: 1.5 },
  ],
  hex: [
    { dimension: 'hard_control', weight: 3.0 },
    { dimension: 'pickoff',      weight: 1.3 },
    { dimension: 'defensive_utility', weight: 1.7 },
  ],
  taunt: [
    { dimension: 'hard_control', weight: 2.0 },
    { dimension: 'pickoff',      weight: 1.2 },
  ],
  fear: [
    { dimension: 'hard_control', weight: 1.5 },
    { dimension: 'pickoff',      weight: 0.7 },
  ],
  forced_movement: [
    { dimension: 'hard_control', weight: 1.5 },
  ],
  knockback: [
    { dimension: 'soft_control', weight: 1.5 },
  ],
  knockup: [
    { dimension: 'hard_control', weight: 2.5 },
    { dimension: 'pickoff',      weight: 1.4 },
  ],
  sleep: [
    { dimension: 'hard_control', weight: 2.0 },
    { dimension: 'pickoff',      weight: 1.3 },
  ],

  // ── Soft Control ──────────────────────────────────────────────────────────
  root: [
    { dimension: 'soft_control', weight: 1.5 },
    { dimension: 'pickoff',      weight: 1.3 },
  ],
  silence: [
    { dimension: 'soft_control', weight: 1.0 },
    { dimension: 'pickoff',      weight: 1.0 },
    { dimension: 'defensive_utility', weight: 0.65 },
  ],
  slow: [
    { dimension: 'soft_control', weight: 0.5 },
    { dimension: 'pickoff',      weight: 0.5 },
  ],
  disarm: [
    { dimension: 'soft_control', weight: 2.0 },
    { dimension: 'defensive_utility', weight: 0.65 },
  ],
  antiheal: [
    { dimension: 'soft_control', weight: 1.5 },
    { dimension: 'pickoff',      weight: 1.0 },
  ],
  banish: [
    { dimension: 'soft_control', weight: 1.5 },
    { dimension: 'hard_control', weight: 1.0 },
    { dimension: 'pickoff',      weight: 0.5 },
    { dimension: 'defensive_utility', weight: 1.9 },
  ],
  leash: [
    { dimension: 'soft_control', weight: 1.5 },
    { dimension: 'pickoff',      weight: 1.0 },
  ],

  // ── Burst Damage (tiered) ─────────────────────────────────────────────────
  low_burst: [
    { dimension: 'burst_damage', weight: 1.0 },
    { dimension: 'pickoff',      weight: 0.5 },
    { dimension: 'waveclear',    weight: 0.5 },
  ],
  medium_burst: [
    { dimension: 'burst_damage', weight: 2.0 },
    { dimension: 'pickoff',      weight: 1.5 },
    { dimension: 'waveclear',    weight: 1.5 },
  ],
  high_burst: [
    { dimension: 'burst_damage', weight: 3.0 },
    { dimension: 'pickoff',      weight: 2.5 },
    { dimension: 'waveclear',    weight: 2.0 },
  ],

  // ── Sustained Damage (tiered) ─────────────────────────────────────────────
  low_sustained: [
    { dimension: 'spell_sustained', weight: 1.0 },
    { dimension: 'pickoff',      weight: 0.5 },
    { dimension: 'waveclear',        weight: 0.5 },
  ],
  medium_sustained: [
    { dimension: 'spell_sustained', weight: 2.0 },
    { dimension: 'pickoff',      weight: 1.0 },
    { dimension: 'waveclear',        weight: 1.0 },
  ],
  high_sustained: [
    { dimension: 'spell_sustained', weight: 3.0 },
    { dimension: 'pickoff',      weight: 1.5 },
    { dimension: 'waveclear',        weight: 1.5 },
  ],

  // ── AOE (tiered) ──────────────────────────────────────────────────────────
  small_aoe: [
    { dimension: 'burst_damage',     weight: 0.5 },
    { dimension: 'waveclear',        weight: 1.0 },
    { dimension: 'spell_sustained', weight: 0.3 },
  ],
  medium_aoe: [
    { dimension: 'burst_damage',     weight: 1.0 },
    { dimension: 'waveclear',        weight: 2.0 },
    { dimension: 'spell_sustained', weight: 0.7 },
  ],
  large_aoe: [
    { dimension: 'burst_damage',     weight: 1.5 },
    { dimension: 'waveclear',        weight: 3.0 },
    { dimension: 'spell_sustained', weight: 1.0 },
  ],

  // ── Reach ─────────────────────────────────────────────────────────────────
  short_range: [
    { dimension: 'reach',            weight: 0.5 },
  ],
  medium_range: [
    { dimension: 'reach',            weight: 1.5 },
  ],
  long_range: [
    { dimension: 'reach',            weight: 2.5 },
  ],
  global: [
    { dimension: 'reach',            weight: 3.0 },
    { dimension: 'map_presence',     weight: 3.0 },
  ],

  // ── Defense / Survivability ───────────────────────────────────────────────
  damage_reduction: [
    { dimension: 'defense',           weight: 1.5 },
    { dimension: 'defensive_utility', weight: 2.0 },
  ],
  armor_gain: [
    { dimension: 'defense',           weight: 1.5 },
  ],
  save: [
    { dimension: 'defensive_utility', weight: 2.5 },
  ],
  hp_growth: [
    { dimension: 'defense',           weight: 1.5 },
  ],

  // ── Sustain (tiered) ────────────────────────────────────────────────────────
  low_heal: [
    { dimension: 'sustain',           weight: 1.0 },
    { dimension: 'defensive_utility', weight: 0.5 },
  ],
  medium_heal: [
    { dimension: 'sustain',           weight: 2.0 },
    { dimension: 'defensive_utility', weight: 1.0 },
  ],
  high_heal: [
    { dimension: 'sustain',           weight: 3.0 },
    { dimension: 'defensive_utility', weight: 1.5 },
  ],
  low_regen: [
    { dimension: 'sustain',           weight: 0.5 },
  ],
  medium_regen: [
    { dimension: 'sustain',           weight: 1.5 },
  ],
  high_regen: [
    { dimension: 'sustain',           weight: 2.5 },
  ],
  shield: [
    { dimension: 'defensive_utility', weight: 3.0 },
  ],
  lifesteal: [
    { dimension: 'sustain',           weight: 2.0 },
  ],
  invulnerability: [
    { dimension: 'defense',           weight: 3.0 },
    { dimension: 'defensive_utility', weight: 1.5 },
  ],

  // ── Duration (multiplier only — no direct dimension weight) ────────────────
  short_duration: [
    { dimension: 'spell_uptime',       weight: 0.7 },
  ],
  medium_duration: [
    { dimension: 'spell_uptime',       weight: 1.4 },
  ],
  long_duration: [
    { dimension: 'spell_uptime',       weight: 2.1 },
  ],

  // ── Mobility ──────────────────────────────────────────────────────────────
  blink: [
    { dimension: 'mobility',         weight: 3.0 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'map_presence',          weight: 1.8 },
  ],
  dash: [
    { dimension: 'mobility',         weight: 2.0 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'map_presence',          weight: 1.5 },
  ],
  movement_speed_boost: [
    { dimension: 'mobility',         weight: 1.0 },
    { dimension: 'map_presence',          weight: 1.2 },
  ],
  escape: [
    { dimension: 'mobility',         weight: 1.0 },
  ],
  teleport: [
    { dimension: 'mobility',         weight: 2.0 },
    { dimension: 'map_presence',     weight: 3.0 },
  ],

  // ── Stealth / Aerial ──────────────────────────────────────────────────────
  stealth: [
    { dimension: 'pickoff',          weight: 1.2 },
    { dimension: 'vision_control',   weight: 1.5 },
    { dimension: 'mobility',         weight: 0.5 },
    { dimension: 'map_presence',     weight: 1.7 },
  ],
  aerial: [
    { dimension: 'vision_control',   weight: 2.5 },
    { dimension: 'pickoff',          weight: 1.3 },
    { dimension: 'mobility',         weight: 1.0 },
    { dimension: 'map_presence',     weight: 1.7 },
  ],
  unobstructed: [
    { dimension: 'vision_control',   weight: 2.3 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'mobility',         weight: 1.0 },
    { dimension: 'map_presence',     weight: 1.7 },
  ],

  // ── Attack / Right-click ──────────────────────────────────────────────────
  attack_speed_boost: [
    { dimension: 'attack_sustained', weight: 2.0 },
    { dimension: 'waveclear',        weight: 1.5 },
    { dimension: 'objective_pressure', weight: 2.5 },
  ],
  armor_reduction: [
    { dimension: 'attack_sustained', weight: 1.5 },
    { dimension: 'pickoff',          weight: 1.0 },
  ],
  attack_damage_boost: [
    { dimension: 'attack_sustained', weight: 2.5 },
    { dimension: 'waveclear',        weight: 1.5 },
    { dimension: 'objective_pressure', weight: 3.0 },
  ],
  attack_modifier: [
    { dimension: 'attack_sustained', weight: 2.0 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'objective_pressure', weight: 2.0 },
  ],
  mana_burn: [
    { dimension: 'pickoff',          weight: 0.5 },
  ],

  // ── Objective Pressure ────────────────────────────────────────────────────
  summon_units: [
    { dimension: 'objective_pressure', weight: 2.0 },
    { dimension: 'vision_control',     weight: 1.0 },
    { dimension: 'map_presence',       weight: 1.0 },
  ],
  illusion: [
    { dimension: 'objective_pressure', weight: 1.5 },
    { dimension: 'attack_sustained',   weight: 2.5 },
    { dimension: 'vision_control',     weight: 1.0 },
    { dimension: 'map_presence',       weight: 1.0 },
    { dimension: 'defense',       weight: 1.0 },
  ],
  siege: [
    { dimension: 'objective_pressure', weight: 3.0 },
  ],
  building_damage: [
    { dimension: 'objective_pressure', weight: 2.5 },
  ],
  push_structures: [
    { dimension: 'objective_pressure', weight: 2.0 },
    { dimension: 'map_presence',       weight: 1.0 },
  ],
  zone_control: [
    { dimension: 'soft_control',       weight: 2.0 },
  ],
  bouncing_attacks: [
    { dimension: 'waveclear',       weight: 1.7 },
    { dimension: 'attack_sustained',       weight: 1.7 },
    { dimension: 'objective_pressure',       weight: 1.5 },
  ],

  // ── Modifiers ─────────────────────────────────────────────────────────────
  channelled: [
    { dimension: 'spell_uptime',       weight: 0.5 },
  ],
  toggle: [
    { dimension: 'spell_uptime',       weight: 1.5 },
  ],

  // ── Utility ───────────────────────────────────────────────────────────────
  dispel: [
    { dimension: 'defensive_utility', weight: 3.0 },
    { dimension: 'defense',           weight: 1.0 },
  ],
  debuff_immunity: [
    { dimension: 'defensive_utility', weight: 3.0 },
    { dimension: 'defense',           weight: 2.5 },
  ],
  vision: [
    { dimension: 'vision_control',    weight: 2.0 },
    { dimension: 'map_presence',    weight: 2.0 },
  ],
  mana_regen: [
    { dimension: 'resource_support',  weight: 3.0 },
  ],
  magic_amp: [
    { dimension: 'burst_damage',      weight: 1.5 },
    { dimension: 'pickoff',           weight: 1.0 },
  ],
  gold_gain: [
    { dimension: 'resource_support',  weight: 2.0 },
  ],
  xp_gain: [
    { dimension: 'resource_support',  weight: 2.0 },
  ],
  status_resist_reduction: [
    { dimension: 'soft_control',      weight: 1.5 },
    { dimension: 'pickoff',           weight: 0.5 },
  ],
  cooldown_reduction: [
    { dimension: 'spell_uptime',      weight: 2.0 },
    { dimension: 'resource_support',  weight: 1.0 },
  ],
  second_life: [
    { dimension: 'defense',  weight: 1.5 },
    { dimension: 'objective_pressure',  weight: 2.0 },
  ],
  increase_buff_duration: [
    { dimension: 'resource_support',  weight: 1.5 },
    { dimension: 'defensive_utility',  weight: 1.5 },
  ],
  grant_armor: [
    { dimension: 'resource_support',  weight: 1.5 },
    { dimension: 'defensive_utility',  weight: 1.5 },
  ],

  // ── Spell Uptime (cooldown-based tempo) ────────────────────────────────────
  passive: [
    { dimension: 'spell_uptime',      weight: 3.0 },
  ],
  short_cooldown: [
    { dimension: 'spell_uptime',      weight: 2.0 },
  ],
  medium_cooldown: [
    { dimension: 'spell_uptime',      weight: 1.0 },
  ],
  long_cooldown: [
    { dimension: 'spell_uptime',      weight: 0.3 },
  ],
}
