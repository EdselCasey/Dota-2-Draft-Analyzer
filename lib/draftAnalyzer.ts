import type { DraftAnalysis, TeamProfile } from './types'
import { resolveHeroes, candidatePool } from './heroLoader'
import { buildTeamProfile } from './scorer'
import { recommendPicks } from './recommender'

export interface DraftInput {
  radiantHeroes: string[]
  direHeroes: string[]
  topN?: number
}

export function analyzeDraft(input: DraftInput): DraftAnalysis {
  const { radiantHeroes, direHeroes, topN = 5 } = input

  const radiantProfiles = resolveHeroes(radiantHeroes)
  const direProfiles = resolveHeroes(direHeroes)

  const radiant: TeamProfile = buildTeamProfile(radiantProfiles)
  const dire: TeamProfile = buildTeamProfile(direProfiles)

  const allDrafted = [...radiantHeroes, ...direHeroes]
  const pool = candidatePool(allDrafted)

  const radiantRecommendations = recommendPicks(radiant, dire, pool, topN)
  const direRecommendations = recommendPicks(dire, radiant, pool, topN)

  return { radiant, dire, radiantRecommendations, direRecommendations }
}
