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
  hard_control:      0.20,
  soft_control:      0.10,
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

// ── Tag sets for multiplier systems ───────────────────────────────────────────
const AOE_TAGS = new Set(['small_aoe', 'medium_aoe', 'large_aoe'])
const RANGE_TAGS = new Set(['short_range', 'medium_range', 'long_range', 'global'])
const PASSIVE_TAG = 'passive'

// Dimensions that passive boosts (innate, always-on)
const PASSIVE_BOOST_DIMS = new Set<DraftDimension>([
  'defense', 'sustain', 'sustained_damage', 'burst_damage'
])

// Dimensions that range boosts (convenience for reactive tools)
const RANGE_BOOST_DIMS = new Set<DraftDimension>([
  'defensive_utility', 'hard_control', 'soft_control', 'sustain', 'pickoff'
])

export function scoreAbility(
  tagged: TaggedAbility,
): Record<DraftDimension, number> {
  const scores = zeroDimensions()

  // ── Determine multipliers ─────────────────────────────────────────────────
  let aoeMultiplier = 1.0
  if (tagged.tags.includes('large_aoe'))       aoeMultiplier = 1.6
  else if (tagged.tags.includes('medium_aoe')) aoeMultiplier = 1.4
  else if (tagged.tags.includes('small_aoe'))  aoeMultiplier = 1.2

  let rangeMultiplier = 1.0
  if (tagged.tags.includes('global'))           rangeMultiplier = 2.0
  else if (tagged.tags.includes('long_range'))  rangeMultiplier = 1.6
  else if (tagged.tags.includes('medium_range')) rangeMultiplier = 1.3
  // short_range = 1.0 (no boost)

  const hasPassive = tagged.tags.includes(PASSIVE_TAG)
  const passiveMultiplier = hasPassive ? 1.2 : 1.0

  // ── Score each tag ────────────────────────────────────────────────────────
  for (const tag of tagged.tags) {
    const weights = TAG_DIMENSION_MAP[tag]
    if (!weights) continue

    // Skip multiplier tags themselves (they don't score directly)
    if (RANGE_TAGS.has(tag) && tag !== 'global') continue

    for (const { dimension, weight } of weights) {
      let multiplier = 1.0

      // AOE combo bonus (applies to non-AOE tags)
      if (aoeMultiplier > 1.0 && !AOE_TAGS.has(tag)) {
        multiplier *= (AOE_COMBO_BONUS[tag] ?? 1.0) * (aoeMultiplier / 1.4)
      }

      // Passive boost (applies to innate/always-on dimensions)
      if (hasPassive && PASSIVE_BOOST_DIMS.has(dimension)) {
        multiplier *= passiveMultiplier
      }

      // Range boost (applies to reactive/utility dimensions)
      if (rangeMultiplier > 1.0 && RANGE_BOOST_DIMS.has(dimension)) {
        multiplier *= rangeMultiplier
      }

      scores[dimension] += weight * multiplier
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
