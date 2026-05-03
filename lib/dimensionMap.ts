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
  // control
  stun:             'control',
  root:             'control',
  silence:          'control',
  hex:              'control',
  slow:             'control',
  disarm:           'control',
  knockback:        'control',
  taunt:            'control',
  forced_movement:  'control',
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
  // push
  summon_units:     'push',
  illusion:         'push',
  siege:            'push',
  building_damage:  'push',
  push_structures:  'push',
  zone_control:     'control',
  // defense
  damage_reduction: 'defense',
  armor_gain:       'defense',
  save:             'defense',
}

export const AOE_BONUS_BY_CATEGORY: Record<string, number> = {
  control:  1.5,
  damage:   1.3,
  mobility: 1.1,
  push:     1.2,
  stealth:  1.2,
  aerial:   1.1,
  defense:  1.1,
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
  // ── Control ───────────────────────────────────────────────────────────────
  stun: [
    { dimension: 'control',      weight: 3.0 },
    { dimension: 'pickoff',      weight: 2.0 },
  ],
  root: [
    { dimension: 'control',      weight: 1.5 },
    { dimension: 'pickoff',      weight: 1.5 },
  ],
  silence: [
    { dimension: 'control',      weight: 1.0 },
    { dimension: 'pickoff',      weight: 1.5 },
    { dimension: 'defensive_utility', weight: 1.0 },
  ],
  hex: [
    { dimension: 'control',      weight: 3.0 },
    { dimension: 'pickoff',      weight: 2.5 },
    { dimension: 'defensive_utility', weight: 1.0 },
  ],
  slow: [
    { dimension: 'control',      weight: 0.5 },
    { dimension: 'pickoff',      weight: 0.5 },
  ],
  disarm: [
    { dimension: 'control',      weight: 2.0 },
    { dimension: 'defensive_utility', weight: 1.0 },
  ],
  knockback: [
    { dimension: 'control',      weight: 1.5 },
  ],
  taunt: [
    { dimension: 'control',      weight: 2.0 },
    { dimension: 'pickoff',      weight: 1.0 },
  ],
  forced_movement: [
    { dimension: 'control',      weight: 1.5 },
  ],
  banish: [
    { dimension: 'control',      weight: 1.5 },
    { dimension: 'pickoff',      weight: 1.0 },
    { dimension: 'defensive_utility', weight: 1.9 },
  ],
  leash: [
    { dimension: 'control',      weight: 1.5 },
    { dimension: 'pickoff',      weight: 1.0 },
  ],

  // ── Burst Damage (tiered) ─────────────────────────────────────────────────
  low_burst: [
    { dimension: 'burst_damage', weight: 1.0 },
    { dimension: 'pickoff',      weight: 0.5 },
  ],
  medium_burst: [
    { dimension: 'burst_damage', weight: 2.0 },
    { dimension: 'pickoff',      weight: 1.5 },
  ],
  high_burst: [
    { dimension: 'burst_damage', weight: 3.0 },
    { dimension: 'pickoff',      weight: 2.5 },
  ],

  // ── Sustained Damage (tiered) ─────────────────────────────────────────────
  low_sustained: [
    { dimension: 'sustained_damage', weight: 1.0 },
  ],
  medium_sustained: [
    { dimension: 'sustained_damage', weight: 2.0 },
  ],
  high_sustained: [
    { dimension: 'sustained_damage', weight: 3.0 },
  ],

  // ── AOE (tiered) ──────────────────────────────────────────────────────────
  small_aoe: [
    { dimension: 'burst_damage',     weight: 0.5 },
    { dimension: 'push',             weight: 0.5 },
    { dimension: 'sustained_damage', weight: 0.3 },
  ],
  medium_aoe: [
    { dimension: 'burst_damage',     weight: 1.0 },
    { dimension: 'push',             weight: 1.5 },
    { dimension: 'sustained_damage', weight: 0.7 },
  ],
  large_aoe: [
    { dimension: 'burst_damage',     weight: 1.5 },
    { dimension: 'push',             weight: 2.5 },
    { dimension: 'sustained_damage', weight: 1.0 },
  ],

  // ── Range (tiered) — range acts as multiplier, no direct dimension weights ──
  short_range: [
    { dimension: 'pickoff',      weight: 0.0 },
  ],
  medium_range: [
    { dimension: 'pickoff',      weight: 0.0 },
  ],
  long_range: [
    { dimension: 'pickoff',      weight: 0.0 },
    { dimension: 'map_presence', weight: 0.0 },
  ],

  // ── Defense / Survivability ───────────────────────────────────────────────
  damage_reduction: [
    { dimension: 'defense',  weight: 2.5 },
    { dimension: 'defensive_utility', weight: 2.2 },
  ],
  armor_gain: [
    { dimension: 'defense',  weight: 2.0 },
  ],
  save: [
    { dimension: 'defensive_utility', weight: 2.5 },
  ],
  hp_growth: [
    { dimension: 'defense',           weight: 3.0 },
  ],

  // ── Sustain ───────────────────────────────────────────────────────────────
  heal: [
    { dimension: 'sustain',           weight: 3.0 },
    { dimension: 'defensive_utility', weight: 1.5 },
    { dimension: 'push',             weight: 1.2 },
    { dimension: 'resource_support',  weight: 2.5 },
  ],
  shield: [
    { dimension: 'defensive_utility', weight: 3.0 },
  ],
  regen: [
    { dimension: 'sustain',           weight: 1.5 },
    { dimension: 'resource_support',  weight: 2.0 },
  ],
  lifesteal: [
    { dimension: 'sustain',           weight: 2.0 },
  ],
  invulnerability: [
    { dimension: 'defense',           weight: 3.0 },
    { dimension: 'defensive_utility', weight: 1.5 },
  ],

  // ── Mobility ──────────────────────────────────────────────────────────────
  blink: [
    { dimension: 'mobility',         weight: 3.0 },
    { dimension: 'pickoff',          weight: 1.5 },
  ],
  dash: [
    { dimension: 'mobility',         weight: 2.0 },
    { dimension: 'pickoff',          weight: 0.5 },
  ],
  movement_speed_boost: [
    { dimension: 'mobility',         weight: 1.0 },
  ],
  escape: [
    { dimension: 'mobility',         weight: 1.0 },
    { dimension: 'defense',          weight: 0.35 },
  ],
  teleport: [
    { dimension: 'mobility',         weight: 2.0 },
    { dimension: 'map_presence',     weight: 3.0 },
  ],

  // ── Stealth / Aerial ──────────────────────────────────────────────────────
  stealth: [
    { dimension: 'pickoff',          weight: 2.5 },
    { dimension: 'vision_control',   weight: 1.5 },
    { dimension: 'mobility',         weight: 0.5 },
    { dimension: 'map_presence',     weight: 1.0 },
  ],
  aerial: [
    { dimension: 'vision_control',   weight: 2.5 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'mobility',         weight: 0.5 },
    { dimension: 'map_presence',     weight: 1.0 },
  ],
  unobstructed: [
    { dimension: 'vision_control',   weight: 2.3 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'mobility',         weight: 0.5 },
    { dimension: 'map_presence',     weight: 1.0 },
  ],

  // ── Attack / Right-click ──────────────────────────────────────────────────
  attack_speed_boost: [
    { dimension: 'sustained_damage', weight: 1.2 },
    { dimension: 'push',             weight: 1.2 },
  ],
  armor_reduction: [
    { dimension: 'sustained_damage', weight: 1.5 },
    { dimension: 'pickoff',          weight: 0.5 },
  ],
  attack_damage_boost: [
    { dimension: 'sustained_damage', weight: 2.5 },
    { dimension: 'push',             weight: 1.3 },
  ],
  attack_modifier: [
    { dimension: 'sustained_damage', weight: 2.5 },
    { dimension: 'pickoff',          weight: 0.5 },
  ],

  // ── Push / Objective ──────────────────────────────────────────────────────
  summon_units: [
    { dimension: 'push',             weight: 2.5 },
    { dimension: 'sustained_damage', weight: 1.0 },
    { dimension: 'vision_control',   weight: 1.0 },
    { dimension: 'map_presence',     weight: 1.0 },
  ],
  illusion: [
    { dimension: 'push',             weight: 2.0 },
    { dimension: 'sustained_damage', weight: 2.5 },
    { dimension: 'vision_control',   weight: 1.0 },
    { dimension: 'map_presence',     weight: 1.0 },
  ],
  siege: [
    { dimension: 'push',             weight: 3.0 },
  ],
  building_damage: [
    { dimension: 'push',             weight: 2.5 },
  ],
  push_structures: [
    { dimension: 'push',             weight: 2.0 },
    { dimension: 'map_presence',     weight: 1.0 },
  ],
  zone_control: [
    { dimension: 'control',          weight: 2.0 },
    { dimension: 'map_presence',     weight: 1.5 },
  ],

  // ── Modifiers ─────────────────────────────────────────────────────────────
  channelled: [],
  global: [
    { dimension: 'map_presence',     weight: 3.0 },
  ],

  // ── Utility ───────────────────────────────────────────────────────────────
  dispel: [
    { dimension: 'defensive_utility', weight: 3.0 },
    { dimension: 'defense',           weight: 1.0 },
  ],
  debuff_immunity: [
    { dimension: 'defensive_utility', weight: 3.0 },
    { dimension: 'defense',           weight: 1.5 },
  ],
  vision: [
    { dimension: 'vision_control',    weight: 2.0 },
  ],
  mana_regen: [
    { dimension: 'resource_support',  weight: 3.0 },
  ],
  antiheal: [
    { dimension: 'control',           weight: 1.5 },
    { dimension: 'pickoff',           weight: 1.5 },
  ],
  magic_amp: [
    { dimension: 'burst_damage',      weight: 1.5 },
    { dimension: 'pickoff',           weight: 0.5 },
  ],
  gold_gain: [
    { dimension: 'resource_support',  weight: 2.0 },
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
