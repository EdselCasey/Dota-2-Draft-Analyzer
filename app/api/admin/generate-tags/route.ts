import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import type { CleanedAbility, AbilityTag, TagProps } from '@/lib/types'
import { tagHero } from '@/lib/tagger'
import { extractAllProps } from '@/lib/tagProps'
import { invalidateCache } from '@/lib/heroLoader'

const HEROES_DIR    = path.join(process.cwd(), 'data', 'heroes_clean')
const HERO_TAGS_DIR = path.join(process.cwd(), 'data', 'hero_tags')
const TAGLIST_PATH  = path.join(process.cwd(), 'data', 'taglist.txt')

const TAGLIST_CONTENT = `# Dota 2 Draft Analyzer — Ability Tag Reference
# Generated automatically. Edit hero_tags/{hero}.json to override per-hero tags.
#
# File format (new):
#   {
#     "ability_name": {
#       "tags": ["tag1", "tag2"],
#       "props": {
#         "stun":  { "duration": 2.0, "range": 900, "cooldown": 14 },
#         "burst": { "damage": 300,   "range": 900, "cooldown": 14 }
#       }
#     }
#   }
#
# Old format (still supported for backward compat):
#   { "ability_name": ["tag1", "tag2"] }
#
# ── PROPS per tag ─────────────────────────────────────────────────────────────
# burst / aoe_damage : damage, range, cooldown
# dps               : hps (damage per second), duration, cooldown
# heal              : heal_amount, hps (heal per second), cooldown
# blink / dash      : range, cooldown
# stun / root / silence / hex / slow / disarm / forced_movement : duration, range, cooldown
#
# Props control proportional weighting: abilities at the high end of their
# global range score up to 1.5× while those at the low end score 0.5×.
# ─────────────────────────────────────────────────────────────────────────────

# ── CONTROL ──────────────────────────────────────────────────────────────────
stun              # Hard stun, completely stops the target
root              # Roots the target in place (can still use abilities)
silence           # Prevents ability use
hex               # Transforms target, disabling most actions
slow              # Reduces movement and/or attack speed
disarm            # Prevents attacking (miss chance also counts)
knockback         # Launches target away / displacement
taunt             # Forces target to attack the caster
forced_movement   # Drags, pulls, or fears — uncontrollable movement
antiheal          # Reduces or blocks enemy healing / regen

# ── BURST DAMAGE ─────────────────────────────────────────────────────────────
burst             # Single-hit nuke (high instant damage)  [props: damage, range, cooldown]
aoe_damage        # Area-of-effect nuke                    [props: damage, range, radius, cooldown]
magic_amp         # Amplifies magic damage taken by target

# ── SUSTAINED DAMAGE ─────────────────────────────────────────────────────────
dps               # Damage over time / damage per second   [props: hps, duration, cooldown]
attack_modifier   # On-hit attack proc (AUTOCAST or ATTACK behavior)
attack_speed_boost  # Increases own attack speed
attack_damage_boost # Increases own attack damage or crit
armor_reduction   # Reduces enemy armor (amplifies physical damage)

# ── SUSTAIN ──────────────────────────────────────────────────────────────────
heal              # Heals a unit (self or ally)            [props: heal_amount, hps, cooldown]
lifesteal         # Recovers HP based on damage dealt
shield            # Temporary HP buffer / damage absorb
regen             # Passive or persistent HP regeneration

# ── MOBILITY ─────────────────────────────────────────────────────────────────
blink             # Instant-position teleport (blink dagger style)  [props: range, cooldown]
dash              # Rapid directional movement / repositioning       [props: range, cooldown]
movement_speed_boost # Persistent or on-cast movement speed increase
escape            # Mobility specifically for disengaging / untargetable
teleport          # Teleports hero across the map                   [props: cooldown]

# ── DEFENSE ──────────────────────────────────────────────────────────────────
damage_reduction  # Reduces incoming damage (flat or %)
armor_gain        # Increases own armor
save              # Rescues an ally from harm (e.g. disruption, shallow grave)
invulnerability   # Briefly makes target immune to damage
dispel            # Removes debuffs from allies
debuff_immunity   # Prevents or ignores debuffs / magic immunity

# ── PUSH / OBJECTIVE ─────────────────────────────────────────────────────────
push_structures   # Explicit push / building-damage mechanic
zone_control      # Spawns a persistent structure or area denial zone
summon_units      # Creates units (creeps, spiders, boar, clone, dominate)
illusion          # Creates illusion copies of the hero
siege             # Amplified or dedicated building damage
building_damage   # Bonus damage to buildings

# ── VISION / MAP PRESENCE ────────────────────────────────────────────────────
stealth           # Turns hero invisible
aerial            # Grants flying/elevated movement (vision bonus)
vision            # Provides sight (wards, scouting projectiles)
global            # Ability has global / map-wide range

# ── UTILITY / SUPPORT ────────────────────────────────────────────────────────
mana_regen        # Restores mana to self or allies

# ── INTERNAL (combo logic, not directly scored) ───────────────────────────────
aoe               # Ability has area of effect (used for AOE combo bonus)
channelled        # Ability requires channelling
`

type AbilityEntry = {
  tags: AbilityTag[]
  props?: Partial<Record<AbilityTag, TagProps>>
}

export async function GET(): Promise<NextResponse> {
  if (!fs.existsSync(HEROES_DIR)) {
    return NextResponse.json(
      { status: 'error', message: 'heroes_clean directory not found. This route is only available in local development with Valve source data present.' },
      { status: 503 }
    )
  }

  try {
    fs.mkdirSync(HERO_TAGS_DIR, { recursive: true })

    const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'))
    const results: Record<string, { abilities: number; tags: number }> = {}

    for (const file of files) {
      const heroName = file.replace('.json', '')
      const raw = fs.readFileSync(path.join(HEROES_DIR, file), 'utf-8')
      const abilities = JSON.parse(raw) as Record<string, CleanedAbility>

      const tagged = tagHero(abilities)

      const tagMap: Record<string, AbilityEntry> = {}
      for (const ta of tagged) {
        const ability = abilities[ta.name]
        const props = ability ? extractAllProps(ta.tags, ability) : {}
        tagMap[ta.name] = {
          tags: ta.tags,
          ...(Object.keys(props).length > 0 ? { props } : {}),
        }
      }

      const outPath = path.join(HERO_TAGS_DIR, `${heroName}.json`)
      fs.writeFileSync(outPath, JSON.stringify(tagMap, null, 2), 'utf-8')

      results[heroName] = {
        abilities: tagged.length,
        tags: tagged.reduce((s, t) => s + t.tags.length, 0),
      }
    }

    fs.writeFileSync(TAGLIST_PATH, TAGLIST_CONTENT, 'utf-8')
    invalidateCache()

    return NextResponse.json({
      status: 'ok',
      heroesProcessed: files.length,
      taglistWritten: TAGLIST_PATH,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 }
    )
  }
}
