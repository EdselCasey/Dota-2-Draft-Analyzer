import { deserializeFile } from "valve-kv"
import fs from "fs"
import path from "path"

const heroesFolder = "./heroes"
const outputFolder = "./data/heroes_clean"

if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true })
}

function parseLevels(value) {

  if (!value) return []

  if (typeof value === "string") {
    return value.split(" ").map(Number)
  }

  if (typeof value === "number") {
    return [value]
  }

  return []
}

function parseFlags(str, prefix) {
  if (!str) return []
  return str.split(" | ").map(v => v.replace(prefix, ""))
}

function extractAbilityValues(ability) {

  const effects = {}

  const values = ability.AbilityValues || ability.AbilitySpecial
  if (!values) return effects

  for (const [effectName, effectData] of Object.entries(values)) {

    // case 1: simple value
    if (typeof effectData === "string") {

      if (effectData.includes(" ")) {
        effects[effectName] = parseLevels(effectData)
      } else if (!isNaN(effectData)) {
        effects[effectName] = Number(effectData)
      } else {
        effects[effectName] = effectData
      }

      continue
    }

    // case 2: nested object with "value"
    if (typeof effectData === "object" && effectData.value) {

      const v = effectData.value

      if (v.includes(" ")) {
        effects[effectName] = parseLevels(v)
      } else if (!isNaN(v)) {
        effects[effectName] = Number(v)
      } else {
        effects[effectName] = v
      }
    }

  }

  return effects
}

const files = fs.readdirSync(heroesFolder)

for (const file of files) {

  if (!file.endsWith(".txt")) continue

  const filePath = path.join(heroesFolder, file)

  const data = deserializeFile(filePath)
  const abilities = data.DOTAAbilities

  const cleaned = {}

  for (const [name, ability] of Object.entries(abilities)) {

    if (name.startsWith("special_bonus")) continue
    if (name === "Version") continue

    cleaned[name] = {
      behavior: parseFlags(
        ability.AbilityBehavior,
        "DOTA_ABILITY_BEHAVIOR_"
      ),

      targetTeam: ability.AbilityUnitTargetTeam
        ?.replace("DOTA_UNIT_TARGET_TEAM_", ""),

      targetType: parseFlags(
        ability.AbilityUnitTargetType,
        "DOTA_UNIT_TARGET_"
      ),

      damageType: ability.AbilityUnitDamageType
        ?.replace("DAMAGE_TYPE_", ""),

      castRange: ability.AbilityCastRange
        ? Number(ability.AbilityCastRange)
        : 0,

      cooldown: parseLevels(ability.AbilityCooldown),

      manaCost: parseLevels(ability.AbilityManaCost),

      effects: extractAbilityValues(ability)
    }
  }

  const heroName = file
    .replace("npc_dota_hero_", "")
    .replace(".txt", "")

  const outputPath = path.join(
    outputFolder,
    `${heroName}.json`
  )

  fs.writeFileSync(
    outputPath,
    JSON.stringify(cleaned, null, 2)
  )

  console.log(`Generated ${heroName}.json`)
}