import type {
  TaggedAbility,
  HeroProfile,
  TeamProfile,
  DraftDimension,
} from './types'
import { ALL_DIMENSIONS } from './types'
import { TAG_DIMENSION_MAP, AOE_COMBO_BONUS } from './dimensionMap'
import { computeTimingScore } from './timing'

// Soft floor for per-hero normalisation ceiling.
const MIN_HERO_CEILING = 5.0

// ── Teamfight composite ───────────────────────────────────────────────────────
const TEAMFIGHT_WEIGHTS: Partial<Record<DraftDimension, number>> = {
  control:           0.30,
  sustained_damage:  0.15,
  sustain:           0.15,
  defense:           0.12,
  defensive_utility: 0.15,
  map_presence:      0.10,
  burst_damage:      0.10,
}

function deriveTeamfight(scores: Record<DraftDimension, number>): number {
  const raw = (Object.entries(TEAMFIGHT_WEIGHTS) as [DraftDimension, number][]).reduce(
    (sum, [dim, w]) => sum + (scores[dim] ?? 0) * w,
    0
  )
  return Math.round(raw * 10) / 10
}

function zeroDimensions(): Record<DraftDimension, number> {
  return Object.fromEntries(ALL_DIMENSIONS.map(d => [d, 0])) as Record<
    DraftDimension,
    number
  >
}

// ── AOE tags that trigger combo bonus ─────────────────────────────────────────
const AOE_TAGS = new Set(['small_aoe', 'medium_aoe', 'large_aoe'])

export function scoreAbility(
  tagged: TaggedAbility,
): Record<DraftDimension, number> {
  const scores = zeroDimensions()

  // Determine AOE combo multiplier from the highest AOE tag present
  let aoeMultiplier = 1.0
  if (tagged.tags.includes('large_aoe'))       aoeMultiplier = 1.6
  else if (tagged.tags.includes('medium_aoe')) aoeMultiplier = 1.4
  else if (tagged.tags.includes('small_aoe'))  aoeMultiplier = 1.2

  for (const tag of tagged.tags) {
    const weights = TAG_DIMENSION_MAP[tag]
    if (!weights) continue

    // Apply AOE combo bonus to non-AOE tags when an AOE tag is present
    const aoeBonus = (aoeMultiplier > 1.0 && !AOE_TAGS.has(tag))
      ? (AOE_COMBO_BONUS[tag] ?? 1.0) * (aoeMultiplier / 1.4) // scale relative to medium baseline
      : 1.0

    for (const { dimension, weight } of weights) {
      scores[dimension] += weight * aoeBonus
    }
  }

  return scores
}

export function scoreHero(
  taggedAbilities: TaggedAbility[],
): Record<DraftDimension, number> {
  const totals = zeroDimensions()

  for (const ability of taggedAbilities) {
    const abilityScores = scoreAbility(ability)
    for (const dim of ALL_DIMENSIONS) {
      totals[dim] += abilityScores[dim]
    }
  }

  return totals
}

// Normalise a raw score to 0–10 against a fixed ceiling.
export function normalise(raw: number, ceiling: number): number {
  return Math.round((raw / ceiling) * 100) / 10
}

export function buildHeroProfile(
  name: string,
  taggedAbilities: TaggedAbility[],
): HeroProfile {
  const rawScores = scoreHero(taggedAbilities)

  const heroMax = Math.max(...Object.values(rawScores), MIN_HERO_CEILING)

  const dimensionScores = Object.fromEntries(
    ALL_DIMENSIONS.map(d => [d, normalise(rawScores[d], heroMax)])
  ) as Record<DraftDimension, number>

  dimensionScores.teamfight = deriveTeamfight(dimensionScores)

  const timing = computeTimingScore(taggedAbilities)

  return { name, taggedAbilities, dimensionScores, timing }
}

// Aggregate five hero profiles into a team profile.
function diminishingSum(values: number[]): number {
  return values.reduce((acc, v, i) => acc + v / Math.sqrt(i + 1), 0)
}

export function buildTeamProfile(heroes: HeroProfile[]): TeamProfile {
  const rawAggregates = zeroDimensions()

  for (const dim of ALL_DIMENSIONS) {
    const values = heroes.map(h => h.dimensionScores[dim]).sort((a, b) => b - a)
    rawAggregates[dim] = diminishingSum(values)
  }

  const maxRaw = Math.max(...Object.values(rawAggregates), 1)
  const aggregateScores = Object.fromEntries(
    ALL_DIMENSIONS.map(d => [d, Math.round((rawAggregates[d] / maxRaw) * 100) / 10])
  ) as Record<DraftDimension, number>

  const WEAKNESS_THRESHOLD = 3.0
  const STRENGTH_THRESHOLD = 7.0

  const weaknesses = ALL_DIMENSIONS.filter(d => aggregateScores[d] < WEAKNESS_THRESHOLD)
  const strengths  = ALL_DIMENSIONS.filter(d => aggregateScores[d] >= STRENGTH_THRESHOLD)

  return { heroes, aggregateScores, rawAggregates, strengths, weaknesses }
}
