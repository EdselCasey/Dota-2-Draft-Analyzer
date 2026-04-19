import type { AbilityTag, DraftDimension } from './types'

export interface TagWeight {
  dimension: DraftDimension
  weight: number
}

// ── AOE combo system (extensible via categories) ───────────────────────────
//
// Tags are assigned to a broad category. When a tag co-occurs with 'aoe' on
// the same ability, its dimension contributions are multiplied by the bonus
// defined for that category. Adding a new tag only requires updating
// TAG_CATEGORY; AOE_COMBO_BONUS is derived automatically.

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
  burst:            'damage',
  dps:              'damage',
  aoe_damage:       'damage',
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
}

// Derived automatically — scorer.ts continues to use this interface unchanged.
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
    { dimension: 'control',      weight: 1.0 },  // removed teamfight — silence is CC, not teamfight
    { dimension: 'pickoff',      weight: 1.5 },
    { dimension: 'defensive_utility',      weight: 1.0 },
  ],
  hex: [
    { dimension: 'control',      weight: 3.0 },
    { dimension: 'pickoff',      weight: 2.5 },
    { dimension: 'defensive_utility',      weight: 1.0 },
  ],
  slow: [
    { dimension: 'control',      weight: 0.5 },  // removed teamfight — slow alone doesn't win fights
    { dimension: 'pickoff',      weight: 0.5 },
  ],
  disarm: [
    { dimension: 'control',      weight: 2.0 },  // removed 
    { dimension: 'defensive_utility',      weight: 1.0 },
  ],
  knockback: [
    { dimension: 'control',      weight: 1.5 },  // removed teamfight
  ],
  taunt: [
    { dimension: 'control',      weight: 2.0 },
    { dimension: 'pickoff',      weight: 1.0 },
  ],
  forced_movement: [
    { dimension: 'control',      weight: 1.5 },  // removed teamfight
  ],
  banish: [
    { dimension: 'control',      weight: 1.5 },  // removed teamfight
    { dimension: 'pickoff',      weight: 1.0 },
    { dimension: 'defensive_utility',      weight: 1.9 },
  ],
  leash: [
    { dimension: 'control',      weight: 1.5 },  // removed teamfight
    { dimension: 'pickoff',      weight: 1.0 },
  ],

  // ── Damage pattern ────────────────────────────────────────────────────────
  burst: [
    { dimension: 'burst_damage', weight: 2.5 },
    { dimension: 'pickoff',      weight: 2.0 },
  ],
  dps: [
    { dimension: 'sustained_damage', weight: 1.0 },
  ],
  // aoe_damage: AoE spells are burst by nature — teamfight composite picks them up via burst_damage
  aoe_damage: [
    { dimension: 'burst_damage',     weight: 1.5 },
    { dimension: 'push',             weight: 1.5 },
    { dimension: 'sustained_damage',             weight: 1.0 },
  ],

  // ── Defense / Survivability ───────────────────────────────────────────────
  damage_reduction: [
    { dimension: 'defense',  weight: 2.5 },  // removed sustain
    { dimension: 'defensive_utility', weight: 2.2 },

  ],
  armor_gain: [
    { dimension: 'defense',  weight: 2.0 },  // removed sustain
  ],
  save: [
    { dimension: 'defense',           weight: 1.2 },
    { dimension: 'defensive_utility', weight: 2.5 },  // removed sustain
  ],
  hp_growth: [
    { dimension: 'defense',           weight: 3.0 },
  ],

  // ── Sustain: heals, hp regen, lifesteal only ──────────────────────────────
  heal: [
    { dimension: 'sustain',           weight: 3.0 },
    { dimension: 'defensive_utility', weight: 1.5 },
    { dimension: 'push',             weight: 1.2 },
    { dimension: 'resource_support',  weight: 2.5 },
  ],
  shield: [
    { dimension: 'defense',           weight: 3.0 },  // removed sustain — shields are defense
    { dimension: 'defensive_utility', weight: 1.5 },
  ],
  regen: [
    { dimension: 'sustain',           weight: 1.5 },  // increased from 1.5
    { dimension: 'resource_support',  weight: 2.0 },
  ],
  lifesteal: [
    { dimension: 'sustain',           weight: 2.0 },  // increased from 1.5
  ],
  invulnerability: [
    { dimension: 'defense',           weight: 3.0 },  // removed sustain + teamfight
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
    { dimension: 'map_presence',     weight: 1.0 }
  ],
  aerial: [
    { dimension: 'vision_control',   weight: 2.5 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'mobility',         weight: 0.5 },
    { dimension: 'map_presence',     weight: 1.0 }
  ],
  unobstructed: [
    { dimension: 'vision_control',   weight: 2.3 },
    { dimension: 'pickoff',          weight: 1.0 },
    { dimension: 'mobility',         weight: 0.5 },
    { dimension: 'map_presence',     weight: 1.0 }
  ],

  // ── Attack / Right-click ──────────────────────────────────────────────────
  // These explicitly signal a right-click / physical-attack playstyle,
  // not spell damage — so they map to sustained_damage only.
  attack_speed_boost: [
    { dimension: 'sustained_damage', weight: 1.2 },
    { dimension: 'push',             weight: 1.2 },
  ],
  armor_reduction: [
    { dimension: 'sustained_damage', weight: 1.5 }, // amplifies physical attack damage
    { dimension: 'pickoff',          weight: 0.5 },
  ],
  attack_damage_boost: [
    { dimension: 'sustained_damage', weight: 2.5 },
    { dimension: 'push',             weight: 1.3 },
  ],
  attack_modifier: [
    { dimension: 'sustained_damage', weight: 2.5 },
    { dimension: 'pickoff',          weight: 0.5 }, // modifiers enable killing in range
  ],

  // ── Push / Objective ──────────────────────────────────────────────────────
  summon_units: [
    { dimension: 'push',             weight: 2.5 },
    { dimension: 'sustained_damage', weight: 1.0 },
    { dimension: 'vision_control', weight: 1.0 },
    { dimension: 'map_presence',     weight: 1.0 },
  ],
  illusion: [
    { dimension: 'push',             weight: 2.0 },
    { dimension: 'sustained_damage', weight: 2.5 },
    { dimension: 'vision_control', weight: 1.0 },
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

  // ── AoE / Teamfight modifiers ─────────────────────────────────────────────
  // aoe: modifier tag only — no dimension score; AoE damage signal comes from aoe_damage tag
  aoe: [
    { dimension: 'push', weight: 1.0 },
  ],
  // channelled: behavior marker only — damage from channelled abilities already scores via dps tag
  channelled: [],
  global: [
    { dimension: 'map_presence',     weight: 3.0 },  // removed teamfight
  ],

  // ── Utility (disaggregated) ───────────────────────────────────────────────
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
    { dimension: 'resource_support',  weight: 3.0 },  // removed sustain
  ],
  antiheal: [
    { dimension: 'control',           weight: 1.5 },  // denying healing is soft control
    { dimension: 'pickoff',           weight: 1.5 },  // makes targets easier to kill
  ],
  magic_amp: [
    { dimension: 'burst_damage',      weight: 1.5 },  // amplifies nuke output
    { dimension: 'pickoff',           weight: 0.5 },
  ],
}
