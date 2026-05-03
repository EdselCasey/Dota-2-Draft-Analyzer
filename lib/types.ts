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
  // ── Damage pattern ───────────────────────────────────────────────────────
  | 'burst'        // single-target nuke
  | 'dps'          // damage over time / repeated tick damage
  | 'aoe_damage'   // area-of-effect damage
  // ── Defense / Survivability ───────────────────────────────────────────────
  | 'damage_reduction'  // % or flat damage reduction on self or allies
  | 'armor_gain'        // bonus armor from abilities
  | 'save'              // removes / shields an ally from incoming harm
  | 'hp_growth'              // raises ehp
  // ── Sustain ──────────────────────────────────────────────────────────────
  | 'heal'
  | 'shield'
  | 'regen'
  | 'lifesteal'
  | 'invulnerability'
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
  | 'unobstructed'    // grants phasing or terrain traversal movement — sees over cliffs and trees
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
  // ── Modifiers (non-scoring, used for combo logic) ─────────────────────────
  | 'aoe'
  | 'channelled'
  // ── Spell Uptime (cooldown-based tempo tags) ────────────────────────────
  | 'passive'           // always active, no cooldown
  | 'short_cooldown'    // 6–15s cooldown
  | 'medium_cooldown'   // 16–40s cooldown
  | 'long_cooldown'     // 60s+ cooldown

export type DraftDimension =
  | 'teamfight'
  | 'control'
  | 'burst_damage'        // replaces old 'burst'
  | 'sustained_damage'    // new: DPS / damage-over-time pressure
  | 'sustain'
  | 'defense'             // new: reactive protection (shield, dispel, debuff immunity)
  | 'mobility'
  | 'push'
  | 'pickoff'
  | 'vision_control'      // replaces utility/vision
  | 'map_presence'        // global abilities, teleport, cross-map impact
  | 'resource_support'    // mana regen, cooldown auras, teamwide buffs
  | 'defensive_utility'   // dispel, purge, debuff immunity (reactive tools)
  | 'spell_uptime'        // how frequently a team can use abilities (tempo axis)

export const ALL_DIMENSIONS: DraftDimension[] = [
  'teamfight',
  'control',
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

/**
 * Optional numeric properties attached to a single tag on an ability.
 * Used for global proportional scaling: a blink with higher range weights more than a short one.
 */
export interface TagProps {
  /** Base damage (for burst / aoe_damage) */
  damage?: number
  /** Heal amount per cast (for heal) */
  heal_amount?: number
  /** Heal or damage per second (for heal, dps) */
  hps?: number
  /** Cast / effect range in units */
  range?: number
  /** Effect duration in seconds (for stuns, roots, slows, etc.) */
  duration?: number
  /** Base cooldown in seconds */
  cooldown?: number
  /** AoE radius in units */
  radius?: number
}

export interface TaggedAbility {
  name: string
  tags: AbilityTag[]
  /** Max damage value extracted from effects, set for burst / aoe_damage abilities only */
  damageMagnitude?: number
  /** Per-tag numeric properties used for proportional global scaling */
  props?: Partial<Record<AbilityTag, TagProps>>
}

export interface HeroProfile {
  name: string
  taggedAbilities: TaggedAbility[]
  dimensionScores: Record<DraftDimension, number>
  /** Timing result derived from ability tags — indicates when the hero peaks */
  timing: import('./timing').TimingResult
}

export interface TeamProfile {
  heroes: HeroProfile[]
  /** Normalized 0-10 scores, relative to this team's own highest dimension */
  aggregateScores: Record<DraftDimension, number>
  /** Pre-normalization sums — used for cross-team comparison with a shared scale */
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
