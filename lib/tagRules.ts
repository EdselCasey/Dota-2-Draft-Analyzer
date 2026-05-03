import type { AbilityTag, CleanedAbility } from './types'

type EffectMap = Record<string, number | number[] | string>

function effectKeys(effects: EffectMap): string[] {
  return Object.keys(effects).map(k => k.toLowerCase())
}

function hasEffectKey(effects: EffectMap, ...patterns: string[]): boolean {
  const keys = effectKeys(effects)
  return patterns.some(p => keys.some(k => k.includes(p)))
}

function getMaxEffectValue(effects: EffectMap, ...patterns: string[]): number {
  let max = 0
  for (const [k, v] of Object.entries(effects)) {
    if (patterns.some(p => k.toLowerCase().includes(p))) {
      const val = Array.isArray(v)
        ? Math.max(...(v as number[]))
        : typeof v === 'number'
        ? v
        : 0
      if (val > max) max = val
    }
  }
  return max
}

function hasBehavior(ability: CleanedAbility, ...flags: string[]): boolean {
  return flags.some(f => ability.behavior.includes(f))
}

function isEnemyTargeting(ability: CleanedAbility): boolean {
  return ability.targetTeam === 'ENEMY' || ability.targetTeam === 'BOTH'
}

function isFriendlyTargeting(ability: CleanedAbility): boolean {
  return ability.targetTeam === 'FRIENDLY' || ability.targetTeam === 'BOTH'
}

function isPassive(ability: CleanedAbility): boolean {
  return (
    ability.behavior.includes('PASSIVE') || ability.behavior.includes('PASSIVE_ONHIT')
  )
}

function isHidden(ability: CleanedAbility): boolean {
  return ability.behavior.includes('HIDDEN') && !ability.behavior.includes('SHOW_IN_GUIDES')
}

export function inferTags(name: string, ability: CleanedAbility): AbilityTag[] {
  // Exclude: purely hidden passives AND hidden non-learnable abilities
  // (e.g. portal_warp — an internal animation channel, not a real hero ability)
  if (isHidden(ability) && (isPassive(ability) || ability.behavior.includes('NOT_LEARNABLE'))) return []

  const tags = new Set<AbilityTag>()
  const e = ability.effects

  // ── AOE ──────────────────────────────────────────────────────────────────
  if (
    hasBehavior(ability, 'AOE') ||
    (hasEffectKey(e, 'radius', 'aoe_radius', 'effect_radius') &&
      getMaxEffectValue(e, 'radius', 'aoe_radius', 'effect_radius') > 150)
  ) {
    tags.add('medium_aoe')
  }

  // ── CHANNELLED ────────────────────────────────────────────────────────────
  if (hasBehavior(ability, 'CHANNELLED')) tags.add('channelled')

  // ── GLOBAL ───────────────────────────────────────────────────────────────
  if (ability.castRange > 5000 || hasEffectKey(e, 'global')) tags.add('global')

  // ── CONTROL: stun, root, silence, hex, slow, disarm, knockback, taunt ───
  if (hasEffectKey(e, 'stun_duration', 'stun_time')) tags.add('stun')

  if (hasEffectKey(e, 'root_duration', 'entangle_duration', 'immobilize_duration')) {
    tags.add('root')
  }
  // Frostbite-style root: enemy unit-target with only duration + dps and no explicit stun/slow key
  if (
    !isPassive(ability) &&
    isEnemyTargeting(ability) &&
    hasEffectKey(e, 'duration') &&
    hasEffectKey(e, 'damage_per_second') &&
    !hasEffectKey(e, 'slow', 'stun', 'silence', 'hex')
  ) {
    tags.add('root')
  }

  if (hasEffectKey(e, 'silence_duration', 'silence')) tags.add('silence')

  if (hasEffectKey(e, 'hex_duration', 'polymorph', 'sheep')) tags.add('hex')

  if (
    hasEffectKey(e, 'slow', 'movespeed_slow', 'ms_slow', 'move_slow', 'slow_duration')
  ) {
    tags.add('slow')
  }

  if (hasEffectKey(e, 'disarm', 'disarm_duration', 'miss_chance_on_target', 'miss_chance')) tags.add('disarm')

  if (hasEffectKey(e, 'knockback', 'push_length', 'launch_distance', 'repel_speed')) {
    tags.add('knockback')
  }

  if (hasEffectKey(e, 'taunt', 'force_attack')) tags.add('taunt')
  // Axe Berserker's Call pattern: NO_TARGET + radius + duration, no damage keys
  if (
    hasBehavior(ability, 'NO_TARGET') &&
    hasEffectKey(e, 'radius') &&
    hasEffectKey(e, 'duration') &&
    !isPassive(ability) &&
    !hasEffectKey(e, 'damage', 'damage_per_second', 'heal')
  ) {
    tags.add('taunt')
  }

  if (hasEffectKey(e, 'forced_movement', 'pull_speed', 'drag', 'fear')) tags.add('forced_movement')

  // ── ATTACK / RIGHT-CLICK ─────────────────────────────────────────────────
  // Only detect on passives or self/friendly abilities so we don't confuse
  // ability-damage keys (e.g. 'damage' on a nuke) with attack-damage boosts.
  const isSelfBuff = isPassive(ability) || isFriendlyTargeting(ability)

  if (
    isSelfBuff &&
    hasEffectKey(e, 'bonus_attack_speed', 'attack_speed_bonus', 'attack_speed',
      'bonus_attack_speed_night', 'bonus_attack_speed_day')
  ) {
    tags.add('attack_speed_boost')
  }

  if (
    isEnemyTargeting(ability) &&
    hasEffectKey(e, 'armor_reduction', 'minus_armor', 'armor_reduce')
  ) {
    tags.add('armor_reduction')
  }

  if (
    isSelfBuff &&
    hasEffectKey(e, 'bonus_damage', 'attack_damage', 'bonus_attack_damage',
      'bonus_hero_damage', 'damage_bonus', 'crit_chance', 'crit_multiplier',
      'crit_damage_multiplier')
  ) {
    tags.add('attack_damage_boost')
  }

  // attack_modifier: ATTACK behavior = definitive attack modifier (Frost Arrows, etc.)
  // AUTOCAST on an enemy-targeted ability = procs on right-click (Poison Attack, etc.)
  if (
    hasBehavior(ability, 'ATTACK') ||
    (hasBehavior(ability, 'AUTOCAST') && isEnemyTargeting(ability))
  ) {
    tags.add('attack_modifier')
  }
  const hasDamage = hasEffectKey(
    e,
    'damage',
    'nuke_damage',
    'target_damage',
    'explosion_damage',
    'nova_damage',
    'blade_damage'
  )
  const hasDps = hasEffectKey(
    e,
    'damage_per_second',
    'dps',
    'burn_dps',
    'curse_dps',
    'dot_damage',
    'damage_per_tick'
  )

  if (hasDps && isEnemyTargeting(ability)) tags.add('medium_sustained')
  // Passive AoE dps (e.g. Axe Counter Helix)
  if (hasDps && isPassive(ability)) tags.add('medium_sustained')

  if (hasDamage && isEnemyTargeting(ability)) {
    if (hasBehavior(ability, 'CHANNELLED')) {
      // Channelled damage is sustained output (Shackles, Dismember, etc.) not a nuke
      tags.add('medium_sustained')
    } else if (tags.has('medium_aoe')) {
      tags.add('medium_burst')
    } else {
      tags.add('medium_burst')
    }
  }
  // Passive proc damage (e.g. Counter Helix)
  if (hasDamage && isPassive(ability) && tags.has('medium_aoe')) tags.add('medium_burst')

  // ── DEFENSE / SURVIVABILITY ──────────────────────────────────────────────
  if (
    hasEffectKey(e, 'damage_reduction', 'damage_resist', 'damage_reduction_pct',
      'physical_damage_reduction', 'magic_damage_reduction', 'resistance')
  ) {
    tags.add('damage_reduction')
  }

  if (
    hasEffectKey(e, 'bonus_armor', 'armor_bonus', 'armor_per_kill',
      'armor_pct_as_strength', 'base_armor_bonus')
  ) {
    tags.add('armor_gain')
  }

  // save: banishes / makes an ally untargetable (Disruption, Astral Imprisonment, etc.)
  if (
    isFriendlyTargeting(ability) &&
    hasEffectKey(e, 'banish', 'exile', 'disrupt_duration', 'imprisonment_duration',
      'banish_duration')
  ) {
    tags.add('save')
  }
  if (hasEffectKey(e, 'shallow_grave', 'min_health', 'cannot_die')) {
    tags.add('save')
  }

  // ── SUSTAIN: heal, shield, regen, lifesteal ──────────────────────────────
  if (
    hasEffectKey(e, 'heal', 'heal_amount', 'heal_per_second') &&
    (isFriendlyTargeting(ability) || isPassive(ability))
  ) {
    tags.add('medium_heal')
  }
  // Self-heal on enemy-targeted abilities (e.g. Death Coil)
  if (hasEffectKey(e, 'self_heal', 'self_hp_regen')) tags.add('medium_heal')

  if (
    hasEffectKey(e, 'damage_absorb', 'absorb', 'barrier', 'physical_barrier', 'shield')
  ) {
    tags.add('shield')
  }

  if (hasEffectKey(e, 'regen', 'hp_regen', 'base_mana_regen', 'mana_regen')) {
    const isHpRegen = hasEffectKey(e, 'hp_regen', 'regen')
    const isManaRegen = hasEffectKey(e, 'mana_regen', 'base_mana_regen')
    if (isHpRegen) tags.add('medium_regen')
    if (isManaRegen) tags.add('mana_regen')
  }

  if (hasEffectKey(e, 'lifesteal', 'helix_lifesteal')) tags.add('lifesteal')

  if (
    hasEffectKey(e, 'damage_inversion', 'invulnerable', 'invulnerability', 'borrowed_time')
  ) {
    tags.add('invulnerability')
  }
  // Borrowed Time pattern: the damage_inversion key may be mangled; detect by ability name
  if (name.includes('borrowed_time')) tags.add('invulnerability')

  // ── MOBILITY ─────────────────────────────────────────────────────────────
  if (hasBehavior(ability, 'BLINK') || hasEffectKey(e, 'blink_distance')) {
    tags.add('blink')
  }

  if (hasEffectKey(e, 'dash_distance', 'leap_distance', 'jump_distance', 'hop_distance')) {
    tags.add('dash')
  }

  // latch_speed / latch_distance: IO Tether snaps IO toward the tethered ally —
  // travels over walls and through units, used as an escape/reposition tool
  if (hasEffectKey(e, 'latch_speed', 'latch_distance')) {
    tags.add('dash')
  }

  if (
    hasEffectKey(e, 'bonus_movement_speed', 'movement_speed_bonus', 'ms_bonus', 'speed_bonus') &&
    !hasEffectKey(e, 'movespeed_slow', 'ms_slow', 'slow')
  ) {
    tags.add('movement_speed_boost')
  }

  if (hasEffectKey(e, 'invis_duration', 'invisibility_duration', 'phase_duration', 'untargetable_duration')) {
    tags.add('escape')
  }

  // stealth: fade_delay, or explicit stealth semantic key
  if (hasEffectKey(e, 'fade_delay', 'invis_fade_delay', 'stealth')) {
    tags.add('stealth')
  }

  // aerial: flying movement grants unobstructed vision over cliffs and trees
  if (hasEffectKey(e, 'flying_movement', 'flying_vision', 'grants_flying')) {
    tags.add('aerial')
  }

  if (hasEffectKey(e, 'teleport', 'tp_scroll')) tags.add('teleport')

  // ── PUSH / OBJECTIVE ──────────────────────────────────────────────────────
  if (hasEffectKey(e, 'summon', 'spawn', 'unit_count', 'num_units', 'creep_type',
    'creates_clone', 'dominate_creep', 'summons_unit')) {
    tags.add('summon_units')
  }

  if (hasEffectKey(e, 'illusion', 'illusion_count', 'mirror_image')) {
    tags.add('illusion')
  }

  if (hasEffectKey(e, 'tower_dps', 'tower_damage', 'tower_dps_pct')) {
    tags.add('building_damage')
  }

  if (hasEffectKey(e, 'bonus_building_damage', 'building_dps', 'damage_to_buildings')) {
    tags.add('siege')
  }

  if (hasEffectKey(e, 'push_duration', 'push_structures', 'structure_damage_mult')) {
    tags.add('push_structures')
  }

  // zone_control: ability that spawns a persistent structure on the ground
  // (e.g. Clockwerk Power Cogs, Enigma Black Hole area, etc.)
  if (hasEffectKey(e, 'creates_structure', 'zone_radius', 'trap_duration')) {
    tags.add('zone_control')
  }

  // ── UTILITY ───────────────────────────────────────────────────────────────
  if (hasEffectKey(e, 'dispel', 'purge')) tags.add('dispel')
  if (hasEffectKey(e, 'debuff_immunity', 'magic_immunity', 'cc_resistance')) tags.add('debuff_immunity')
  if (hasEffectKey(e, 'vision', 'vision_duration', 'sight_range',
    'vision_on_target', 'grants_vision', 'vision_radius')) tags.add('vision')

  // antiheal: abilities that reduce or block enemy healing
  if (hasEffectKey(e, 'antiheal', 'antiheal_reduction', 'heal_reduction', 'heal_reduction_pct',
    'heal_amp_reduction', 'regen_reduction')) tags.add('antiheal')

  // magic_amp: abilities that increase magic damage taken by the target
  if (hasEffectKey(e, 'magic_damage_amplification', 'magic_amp', 'magic_resistance_reduction',
    'magic_resist_reduction_pct', 'spell_amp_bonus')) tags.add('magic_amp')

  return Array.from(tags)
}
