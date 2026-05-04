export type AbilityTag =
  // ── Control ──────────────────────────────────────────────────────────────
  | 'stun'
  | 'root'
  | 'silence'
  | 'hex'
  | 'slow'
  | 'disarm'
  | 'knockback'
  | 'taunt'
  | 'forced_movement'
  | 'banish'
  | 'leash'
  // ── Burst Damage (tiered) ──────────────────────────────────────────────
  | 'low_burst'       // 0–250 base damage
  | 'medium_burst'    // 251–400 base damage
  | 'high_burst'      // 401+ base damage
  // ── Sustained Damage (tiered) ──────────────────────────────────────────
  | 'low_sustained'   // 0–30 DPS
  | 'medium_sustained'// 31–80 DPS
  | 'high_sustained'  // 81+ DPS
  // ── AOE (tiered, replaces aoe + aoe_damage) ────────────────────────────
  | 'small_aoe'       // ~200–300 radius
  | 'medium_aoe'      // ~300–500 radius
  | 'large_aoe'       // ~500+ radius
  // ── Range (tiered) ─────────────────────────────────────────────────────
  | 'short_range'     // 0–300 (melee range)
  | 'medium_range'    // 300–600
  | 'long_range'      // 600+
  // ── Defense / Survivability ───────────────────────────────────────────────
  | 'damage_reduction'  // % or flat damage reduction on self or allies
  | 'armor_gain'        // bonus armor from abilities
  | 'save'              // removes / shields an ally from incoming harm
  | 'hp_growth'         // raises ehp
  // ── Sustain (tiered) ──────────────────────────────────────────────────────
  | 'low_heal'            // small heal amount
  | 'medium_heal'         // moderate heal
  | 'high_heal'           // large / burst heal
  | 'low_regen'           // minor HP regen
  | 'medium_regen'        // moderate regen
  | 'high_regen'          // strong persistent regen
  | 'shield'
  | 'lifesteal'
  | 'invulnerability'
  // ── Duration (multiplier tags) ─────────────────────────────────────────────
  | 'short_duration'      // 0–2s effect
  | 'medium_duration'     // 2–4s effect
  | 'long_duration'       // 4s+ effect
  // ── Mobility (granular) ──────────────────────────────────────────────────
  | 'blink'               // instant repositioning with no travel time
  | 'dash'                // directional movement ability (leap, jump, charge)
  | 'movement_speed_boost'// persistent or on-cast MS increase
  | 'escape'              // invisibility, phase, or untargetable state
  | 'teleport'            // long-range / global repositioning
  // ── Attack / Right-click ─────────────────────────────────────────────────
  | 'attack_speed_boost'   // self/passive attack speed buff — right-click sustained dealer
  | 'armor_reduction'      // reduces enemy armor — amplifies physical attack damage
  | 'attack_damage_boost'  // passive or self-buff bonus attack damage (not spell damage)
  | 'attack_modifier'      // ATTACK behavior or enemy-targeted AUTOCAST — procs on right-click
  // ── Stealth / Aerial ─────────────────────────────────────────────────────
  | 'stealth'   // hero can go invisible (fade_delay on passive or active invis)
  | 'aerial'    // grants flying movement — sees over cliffs and trees
  | 'unobstructed'    // grants phasing or terrain traversal movement
  | 'knockup'           // launches target into the air (disables + displacement)
  | 'sleep'             // puts target to sleep, wakes on damage
  // ── Push / Objective ─────────────────────────────────────────────────────
  | 'summon_units'        // creates persistent units
  | 'illusion'            // creates hero illusions
  | 'siege'               // direct bonus vs buildings
  | 'building_damage'     // passive or on-hit building damage
  | 'push_structures'     // explicit push-lane / structure-pressure mechanic
  | 'zone_control'        // spawns a persistent structure or area denial zone
  // ── Utility ──────────────────────────────────────────────────────────────
  | 'dispel'
  | 'debuff_immunity'
  | 'vision'
  | 'mana_regen'
  | 'global'
  | 'antiheal'           // reduces or blocks enemy healing / regen
  | 'magic_amp'          // amplifies magic damage taken by the target
  | 'gold_gain'
  | 'status_resist_reduction'
  // ── Modifiers (non-scoring) ──────────────────────────────────────────────
  | 'channelled'
  // ── Spell Uptime (cooldown-based tempo tags) ────────────────────────────
  | 'passive'           // always active, no cooldown
  | 'short_cooldown'    // 6–15s cooldown
  | 'medium_cooldown'   // 16–40s cooldown
  | 'long_cooldown'     // 60s+ cooldown

export type DraftDimension =
  | 'teamfight'
  | 'hard_control'
  | 'soft_control'
  | 'burst_damage'
  | 'sustained_damage'
  | 'sustain'
  | 'defense'
  | 'mobility'
  | 'push'
  | 'pickoff'
  | 'vision_control'
  | 'map_presence'
  | 'resource_support'
  | 'defensive_utility'
  | 'spell_uptime'

export const ALL_DIMENSIONS: DraftDimension[] = [
  'teamfight',
  'hard_control',
  'soft_control',
  'burst_damage',
  'sustained_damage',
  'sustain',
  'defense',
  'mobility',
  'push',
  'pickoff',
  'vision_control',
  'map_presence',
  'resource_support',
  'defensive_utility',
  'spell_uptime',
]

export interface CleanedAbility {
  behavior: string[]
  targetTeam?: string
  targetType: string[]
  damageType?: string
  castRange: number
  cooldown: number[]
  manaCost: number[]
  effects: Record<string, number | number[] | string>
}

export interface TaggedAbility {
  name: string
  tags: AbilityTag[]
}

export interface HeroProfile {
  name: string
  taggedAbilities: TaggedAbility[]
  dimensionScores: Record<DraftDimension, number>
  timing: import('./timing').TimingResult
}

export interface TeamProfile {
  heroes: HeroProfile[]
  aggregateScores: Record<DraftDimension, number>
  rawAggregates: Record<DraftDimension, number>
  strengths: DraftDimension[]
  weaknesses: DraftDimension[]
}

export interface PickRecommendation {
  heroName: string
  dimensionScores: Record<DraftDimension, number>
  addressesWeaknesses: DraftDimension[]
  exploitsEnemyWeaknesses: DraftDimension[]
  overallScore: number
  reason: string
}

export interface DraftAnalysis {
  radiant: TeamProfile
  dire: TeamProfile
  radiantRecommendations: PickRecommendation[]
  direRecommendations: PickRecommendation[]
}
