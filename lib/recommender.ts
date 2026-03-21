import type {
  HeroProfile,
  TeamProfile,
  PickRecommendation,
  DraftDimension,
} from './types'
import { ALL_DIMENSIONS } from './types'

// How much weight to give filling your own weaknesses vs exploiting enemy weaknesses.
const WEAKNESS_FILL_WEIGHT = 0.6
const ENEMY_EXPLOIT_WEIGHT = 0.4

// A dimension on the enemy team is considered "exploitable" when their score is below this.
const ENEMY_WEAK_THRESHOLD = 4.0

// Minimum score a candidate hero must have in a dimension to be considered a filler/exploiter.
const CANDIDATE_CONTRIBUTION_THRESHOLD = 4.0

function buildReason(
  candidate: HeroProfile,
  addressedWeaknesses: DraftDimension[],
  exploitedDimensions: DraftDimension[]
): string {
  const parts: string[] = []

  if (addressedWeaknesses.length > 0) {
    parts.push(`patches your team's weakness in: ${addressedWeaknesses.join(', ')}`)
  }

  if (exploitedDimensions.length > 0) {
    parts.push(`exploits enemy's weakness in: ${exploitedDimensions.join(', ')}`)
  }

  const topDim = ALL_DIMENSIONS.reduce((best, d) =>
    candidate.dimensionScores[d] > candidate.dimensionScores[best] ? d : best
  )
  parts.push(`hero's strongest dimension is ${topDim} (${candidate.dimensionScores[topDim].toFixed(1)})`)

  return parts.join('; ')
}

export function recommendPicks(
  myTeam: TeamProfile,
  enemyTeam: TeamProfile,
  candidatePool: HeroProfile[],
  topN = 5
): PickRecommendation[] {
  const enemyWeakDimensions = ALL_DIMENSIONS.filter(
    d => enemyTeam.aggregateScores[d] < ENEMY_WEAK_THRESHOLD
  )

  const recommendations: PickRecommendation[] = []

  for (const candidate of candidatePool) {
    const addressedWeaknesses: DraftDimension[] = myTeam.weaknesses.filter(
      d => candidate.dimensionScores[d] >= CANDIDATE_CONTRIBUTION_THRESHOLD
    )

    const exploitedEnemyWeaknesses: DraftDimension[] = enemyWeakDimensions.filter(
      d => candidate.dimensionScores[d] >= CANDIDATE_CONTRIBUTION_THRESHOLD
    )

    const weaknessFillScore = addressedWeaknesses.reduce(
      (sum, d) => sum + candidate.dimensionScores[d],
      0
    )

    const enemyExploitScore = exploitedEnemyWeaknesses.reduce(
      (sum, d) => sum + candidate.dimensionScores[d],
      0
    )

    const overallScore =
      WEAKNESS_FILL_WEIGHT * weaknessFillScore +
      ENEMY_EXPLOIT_WEIGHT * enemyExploitScore

    recommendations.push({
      heroName: candidate.name,
      dimensionScores: candidate.dimensionScores,
      addressesWeaknesses: addressedWeaknesses,
      exploitsEnemyWeaknesses: exploitedEnemyWeaknesses,
      overallScore: Math.round(overallScore * 100) / 100,
      reason: buildReason(candidate, addressedWeaknesses, exploitedEnemyWeaknesses),
    })
  }

  // Sort: first by whether the hero addresses at least one weakness (priority tier),
  // then by overall score descending.
  recommendations.sort((a, b) => {
    const aTierBonus = a.addressesWeaknesses.length > 0 ? 1000 : 0
    const bTierBonus = b.addressesWeaknesses.length > 0 ? 1000 : 0
    return b.overallScore + bTierBonus - (a.overallScore + aTierBonus)
  })

  return recommendations.slice(0, topN)
}
