import type { DraftDimension, TeamProfile } from './types'
import { DIMENSION_LABELS } from './displayNames'
import { STRONG_THRESHOLD, WEAK_THRESHOLD } from './matchupConstants'

// ── Counter relationships ─────────────────────────────────────────────────────
// Each entry: "dimension X counters dimension Y with this strength (0–1)"
// Strength = how effective the counter is when both dimensions are highly scored.
//
// Rules encoded:
//   defense        → strong vs burst, weak vs sustained
//   control        → strong vs sustained, strong vs mobility
//   burst          → strong vs low defense, overwhelms sustain
//   sustain        → counters burst and sustained (out-regen)
//   pickoff        → counters push (kill the pushers)
//   push           → counters teamfight (split-push avoids fights)
//   teamfight      → counters map_presence, partially counters push
//   mobility       → weak vs control (control pins mobility)
//   map_presence   → weak vs teamfight (forced into fights)
//   defensive_utility → counters control (dispel/BKB)

export interface CounterEdge {
  counters: DraftDimension
  strength: number  // 0–1
  /**
   * When true: our score must equal or exceed theirs for this to count as an
   * advantage. Models "volume-matching" counters — e.g. you need enough CC to
   * cover ALL their damage dealers, not just some of them. Having 5.9 control
   * against 7.1 sustained is NOT an advantage; one uncontrolled DPS hero still
   * kills you.
   */
  requiresExcess?: boolean
}

export const COUNTER_MAP: Partial<Record<DraftDimension, CounterEdge[]>> = {
  // ── Defense ───────────────────────────────────────────────────────────────
  defense: [
    { counters: 'burst_damage',     strength: 0.30, requiresExcess: true},                        // absorbs spikes
    { counters: 'sustained_damage', strength: 0.08, requiresExcess: true },  // only relevant if defense actually exceeds the sustained
    { counters: 'pickoff', strength: 0.08, requiresExcess: true },
  ],

  // ── Control ───────────────────────────────────────────────────────────────
  // CC must MATCH OR EXCEED the damage it's trying to lock down. If the enemy
  // has more sustained damage than you have control, one free damage dealer
  // still kills your team. requiresExcess enforces this.
  control: [
    { counters: 'sustained_damage', strength: 0.20, requiresExcess: true },  // needs enough CC to cover all DPS heroes
    { counters: 'burst_damage',     strength: 0.08, requiresExcess: true },  // needs CC on each burst hero
    { counters: 'mobility',         strength: 0.15, requiresExcess: true },                        // CC always pins mobility regardless
    { counters: 'push',             strength: 0.25 },
  ],

  // ── Burst damage ──────────────────────────────────────────────────────────
  burst_damage: [
    { counters: 'sustain',          strength: 0.30 },
    { counters: 'defense',          strength: 0.25 },
  ],

  // ── Sustained damage ──────────────────────────────────────────────────────
  sustained_damage: [
    { counters: 'sustain',          strength: 0.55 },
    { counters: 'defense',          strength: 0.60, requiresExcess: true },  // sustained must exceed defense to wear through
  ],

  // ── Sustain ───────────────────────────────────────────────────────────────
  sustain: [
    { counters: 'burst_damage',     strength: 0.60, requiresExcess: true },
    { counters: 'sustained_damage', strength: 0.50, requiresExcess: true },
  ],

  // ── Pickoff ───────────────────────────────────────────────────────────────
  pickoff: [
    { counters: 'push',             strength: 0.30 },
    { counters: 'map_presence',     strength: 0.60 },
  ],

  // ── Push ──────────────────────────────────────────────────────────────────
  push: [
    { counters: 'teamfight',        strength: 0.65 },
    { counters: 'map_presence',     strength: 0.40 },
  ],

  // ── Teamfight ─────────────────────────────────────────────────────────────
  teamfight: [
    { counters: 'map_presence',     strength: 0.70 },
    { counters: 'burst_damage',     strength: 0.25 },
    { counters: 'sustained_damage', strength: 0.40, requiresExcess: true },  // teamfight must dominate to force carries off
    { counters: 'push',             strength: 1.0 },
    { counters: 'mobility',         strength: 0.35 },
  ],

  // ── Mobility ──────────────────────────────────────────────────────────────
  mobility: [
    { counters: 'control',          strength: 0.25 },
    { counters: 'pickoff',          strength: 0.40 },
  ],

  // ── Map presence ──────────────────────────────────────────────────────────
  map_presence: [
    { counters: 'pickoff',          strength: 0.30 },
  ],

  // ── Defensive utility ─────────────────────────────────────────────────────
  defensive_utility: [
    { counters: 'control',          strength: 0.20 },
    { counters: 'burst_damage',     strength: 0.35 },
    { counters: 'pickoff',          strength: 0.20 },
  ],

  // ── Vision control ────────────────────────────────────────────────────────
  vision_control: [
    { counters: 'pickoff',          strength: 0.60 },
    { counters: 'map_presence',     strength: 0.40 },
  ],
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'critical' | 'notable' | 'minor'
export type InsightType     = 'advantage' | 'vulnerability'

export interface MatchupInsight {
  type:           InsightType
  team:           'radiant' | 'dire'
  severity:       InsightSeverity
  /** The dimension providing the advantage / being exploited */
  ourDimension:   DraftDimension
  ourScore:       number
  /** The enemy dimension being countered / that is doing the countering */
  theirDimension: DraftDimension
  theirScore:     number
  counterStrength: number
  /** Human-readable narrative shown to regular users */
  description:    string
  /** Raw technical string shown only in dev mode */
  debugDescription: string
}

// ── Narrative insight templates ───────────────────────────────────────────────
// advantage: "our ourDim counters their theirDim"
// vulnerability: "their theirDim exploits our weak ourDim"

const ADVANTAGE_NARRATIVE: Partial<Record<DraftDimension, Partial<Record<DraftDimension, string>>>> = {
  defense: {
    burst_damage:     'Your defensive tools absorb spike damage before it can kill teammates.',
    sustained_damage: 'Your team\'s durability lets them endure extended trades.',
  },
  control: {
    sustained_damage: 'Your crowd control locks down their damage dealers before they can output.',
    burst_damage:     'Your CC disrupts their burst windows, buying time to react.',
    mobility:         'Your lockdown punishes heroes trying to dive in and escape.',
    push:             'Your control abilities hold the line and pick off pushers.',
  },
  burst_damage: {
    sustain:          'Your burst kills faster than their healing can respond.',
    defense:          'Your nukes punch through their tankiness in a single window.',
    resource_support: 'Your burst eliminates their backline before they can provide support.',
  },
  sustained_damage: {
    sustain:          'Your constant damage pressure overwhelms their regen over time.',
    defense:          'Your persistent damage wears down even the toughest defenders.',
  },
  sustain: {
    burst_damage:     'Your healing and regen outlast their burst windows.',
    sustained_damage: 'Your sustain keeps your team alive through extended fights.',
  },
  pickoff: {
    push:             'You can eliminate isolated pushers before they do structural damage.',
    map_presence:     'You punish heroes that overextend across the map.',
  },
  push: {
    teamfight:        'You can split push and force them to respond rather than fight.',
    map_presence:     'Your pushing pressure collapses their map control over time.',
  },
  teamfight: {
    map_presence:     'Your team fights better as a unit, negating their spread map game.',
    burst_damage:     'Your team synergy blunts isolated burst attempts.',
    sustained_damage: 'Your grouped strength overwhelms their damage output in fights.',
    push:             'You can force a fight and collapse their push attempts.',
    mobility:         'Your fight presence denies their divers an easy escape.',
  },
  mobility: {
    control:          'Your movement tools help dodge or reposition around their lockdown.',
    pickoff:          'Your mobility lets you escape assassination attempts.',
  },
  map_presence: {
    pickoff:          'Your map vision and presence deters lone hunters.',
  },
  defensive_utility: {
    control:          'Your dispels and immunity tools strip their CC off teammates.',
    burst_damage:     'Your defensive spells absorb or negate key burst attempts.',
  },
  vision_control: {
    pickoff:          'Your vision coverage exposes their gankers before they strike.',
    map_presence:     'You control information, denying their map presence advantage.',
  },
}

const VULNERABILITY_NARRATIVE: Partial<Record<DraftDimension, Partial<Record<DraftDimension, string>>>> = {
  defense: {
    burst_damage:     'Without enough tankiness or shields, your heroes crumble to spikes.',
    sustained_damage: 'Your team lacks the armor and durability to survive prolonged fights.',
  },
  control: {
    sustained_damage: 'You can\'t lock down their damage dealers — expect to be out-traded.',
    burst_damage:     'Without CC to interrupt their combos, their burst will land freely.',
    mobility:         'Your team can\'t pin down their divers, letting them engage and escape at will.',
    push:             'You lack reliable tools to stop their push dead in its tracks.',
  },
  burst_damage: {
    sustain:          'You lack the kill pressure to cut through their sustain.',
    defense:          'Their durability soaks your nuke damage without breaking a sweat.',
    resource_support: 'You can\'t threaten their supports before they pour out resources.',
  },
  sustained_damage: {
    sustain:          'Your DPS is too slow to outpace their healing.',
    defense:          'Their defense outlasts your damage output in extended fights.',
  },
  sustain: {
    burst_damage:     'You have no recovery tools — a single burst combo could end a fight.',
    sustained_damage: 'Without sustain, your team bleeds out under constant pressure.',
  },
  pickoff: {
    push:             'Your team is vulnerable to getting picked before teamfights start.',
    map_presence:     'Enemy hunters can patrol and isolate your heroes freely.',
  },
  push: {
    teamfight:        'You can\'t hard push objectives — their teamfight foffers formidable resistance.',
    map_presence:     'Your pushing game is too fragile against their wide map control.',
  },
  teamfight: {
    map_presence:     'You struggle to contest their spread, forcing unfavorable fights.',
    burst_damage:     'Their burst can dismantle your team before a fight even begins.',
    sustained_damage: 'Their sustained output keeps grinding your grouped heroes down.',
    push:             'Their push threats pull you away from fights you\'re suited for.',
    mobility:         'Their dive heroes scatter your formation before you can react.',
  },
  mobility: {
    control:          'Your team lacks the movement to dodge or escape their CC.',
    pickoff:          'You can\'t outrun their assassins once isolated.',
  },
  map_presence: {
    pickoff:          'Your vision gaps leave heroes exposed to solo kills.',
  },
  defensive_utility: {
    control:          'You have no way to strip debuffs off your team in fights.',
    burst_damage:     'Your team has no protection against focused burst damage.',
  },
  vision_control: {
    pickoff:          'Blind spots on the map give their hunters easy targets.',
    map_presence:     'You\'re fighting without information — their map game runs unchecked.',
  },
}

function buildNarrative(
  type: InsightType,
  ourDim: DraftDimension,
  theirDim: DraftDimension,
): string {
  if (type === 'advantage') {
    return ADVANTAGE_NARRATIVE[ourDim]?.[theirDim]
      ?? `Your ${DIMENSION_LABELS[ourDim]} directly counters their ${DIMENSION_LABELS[theirDim]}.`
  }
  // vulnerability — ourDim is the weak dim, theirDim is what exploits it
  return VULNERABILITY_NARRATIVE[ourDim]?.[theirDim]
    ?? `Their ${DIMENSION_LABELS[theirDim]} exploits your lack of ${DIMENSION_LABELS[ourDim]}.`
}

export interface MatchupAnalysis {
  insights:       MatchupInsight[]
  radiantEdge:    number
  overallFavored: 'radiant' | 'dire' | 'even'
  radiantUrgency: TeamUrgency
  direUrgency:    TeamUrgency
}

// ── Urgency ───────────────────────────────────────────────────────────────────
// Urgency tells each team how aggressively they need to force the game tempo.
// It feeds directly into the recommendation engine:
//   high urgency   → recommend early/aggressive heroes that close gaps fast
//   medium urgency → balanced picks that address weaknesses at any phase
//   low urgency    → scaling heroes that reinforce long-game advantages
//
// Formula:
//   matchupFavor  [0–1]  — how structurally favored this team is (0.5 = even)
//   tempoEarlyness[0–1]  — how early their timing peaks (1 = very early, 0 = very late)
//   urgency = (1 − matchupFavor) × 0.60 + tempoEarlyness × 0.40
//
// Results by archetype:
//   Favored + early    → ~0.44  "Press your advantage" — tools and window align
//   Favored + late     → ~0.20  "Farm and scale"       — time is your friend
//   Unfavored + early  → ~0.80  "Must snowball"        — only window available
//   Unfavored + late   → ~0.56  "Force fights"         — must steal momentum early

export type UrgencyLabel =
  | 'Low Pressure'
  | 'Press Your Advantage'
  | 'Force Fights'
  | 'Must Snowball'
  | 'Critical — Act Now'

/** Which phase of hero picks the recommendation engine should bias toward */
export type RecommendationBias = 'early' | 'balanced' | 'late'

export interface TeamUrgency {
  /** Raw urgency 0–1 */
  score:              number
  label:              UrgencyLabel
  /** Human-readable win condition sentence */
  winCondition:       string
  /** Feeds the recommendation engine — when to look for heroes */
  recommendationBias: RecommendationBias
}

const URGENCY_LABEL_THRESHOLDS: [number, UrgencyLabel][] = [
  [0.25, 'Low Pressure'],
  [0.45, 'Press Your Advantage'],
  [0.62, 'Force Fights'],
  [0.78, 'Must Snowball'],
  [Infinity, 'Critical — Act Now'],
]

export const URGENCY_COLORS: Record<UrgencyLabel, string> = {
  'Low Pressure':       '#a78bfa',  // purple — patient
  'Press Your Advantage': '#34d399',  // green  — confident
  'Force Fights':         '#facc15',  // yellow — caution
  'Must Snowball':        '#fb923c',  // orange — urgent
  'Critical — Act Now':   '#ef4444',  // red    — desperate
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function winConditionText(
  label: UrgencyLabel,
  favored: boolean,
  timing: 'early' | 'mid' | 'late'
): string {
  if (favored && timing === 'late')
    return 'Farm safely and execute your power spike — time is on your side.'
  if (favored && timing === 'early')
    return 'You have the advantage — control the map, play your game, and avoid giving the enemy openings to stabilize.'
  if (favored)
    return 'Flexible win condition — maintain pressure and respond to opponent moves.'
  if (!favored && timing === 'early')
    return 'Must generate leads now — your window is closing fast and the matchup is against you.'
  if (!favored && timing === 'late')
    return 'Structurally behind — force early fights to steal momentum before the disadvantage compounds.'
  return 'Uphill battle — look for picks that directly address structural weaknesses.'
}

function timingCategory(score: number): 'early' | 'mid' | 'late' {
  if (score <= -0.15) return 'early'
  if (score >= 0.15)  return 'late'
  return 'mid'
}

export function computeTeamUrgency(
  /** From THIS team's perspective: positive = this team is favored */
  matchupEdgeForThisTeam: number,
  timingScore: number   // -1 (early) to +1 (late)
): TeamUrgency {
  // Normalize matchup edge to [0, 1] — 1 = fully favored, 0 = fully unfavored.
  // Edge values are typically small floats; scale by 3 to give reasonable spread.
  const matchupFavor  = clamp(0.5 + matchupEdgeForThisTeam * 3, 0, 1)
  // Earlyness: 1 = very early, 0 = very late
  const earlyness     = clamp((1 - timingScore) / 2, 0, 1)

  const raw   = (1 - matchupFavor) * 0.60 + earlyness * 0.40
  const score = Math.round(clamp(raw, 0, 1) * 100) / 100

  const [, label] = URGENCY_LABEL_THRESHOLDS.find(([t]) => score <= t)!

  const favored  = matchupFavor >= 0.5
  const timing   = timingCategory(timingScore)

  const recommendationBias: RecommendationBias =
    score >= 0.62 ? 'early'    :
    score <= 0.28 ? 'late'     : 'balanced'

  return {
    score,
    label,
    winCondition:       winConditionText(label, favored, timing),
    recommendationBias,
  }
}

// ── Scoring thresholds (applied to shared-scale 0–10 scores) ─────────────────
// Insights with intensity below this are too weak to be actionable and are suppressed.
const MIN_INTENSITY    = 0.15

function severity(intensity: number): InsightSeverity | null {
  if (intensity >= 0.35) return 'critical'
  if (intensity >= 0.20) return 'notable'
  if (intensity >= MIN_INTENSITY) return 'minor'
  return null  // below noise floor — suppress entirely
}

// ── Shared normalisation ──────────────────────────────────────────────────────
// Produces a 0–10 score for every dimension using the SAME ceiling for both
// teams — the same scale you see in the comparison bars.

function buildSharedScores(
  radiant: TeamProfile,
  dire:    TeamProfile
): {
  radiantNorm: Record<DraftDimension, number>
  direNorm:    Record<DraftDimension, number>
  sharedMax:   number
} {
  const ALL_DIMS = Object.keys(radiant.rawAggregates) as DraftDimension[]
  const sharedMax = Math.max(
    ...ALL_DIMS.flatMap(d => [radiant.rawAggregates[d] ?? 0, dire.rawAggregates[d] ?? 0]),
    1
  )

  const norm = (raw: Record<DraftDimension, number>) =>
    Object.fromEntries(
      ALL_DIMS.map(d => [d, Math.round(((raw[d] ?? 0) / sharedMax) * 100) / 10])
    ) as Record<DraftDimension, number>

  return {
    radiantNorm: norm(radiant.rawAggregates),
    direNorm:    norm(dire.rawAggregates),
    sharedMax,
  }
}

// ── Core analysis ─────────────────────────────────────────────────────────────

function analyzeOneSide(
  usNorm:   Record<DraftDimension, number>,
  themNorm: Record<DraftDimension, number>,
  team:     'radiant' | 'dire'
): MatchupInsight[] {
  const insights: MatchupInsight[] = []

  // ── Advantages: our strong dimensions that counter their strong dimensions ──
  for (const [ourDim, edges] of Object.entries(COUNTER_MAP) as [DraftDimension, CounterEdge[]][]) {
    const ourScore = usNorm[ourDim] ?? 0
    if (ourScore < STRONG_THRESHOLD) continue

    for (const { counters: theirDim, strength, requiresExcess } of edges) {
      const theirScore = themNorm[theirDim] ?? 0
      if (theirScore < STRONG_THRESHOLD) continue

      // Volume-matching check: if this counter needs dominance (e.g. control vs
      // sustained), our score must equal or exceed theirs. Having 5.9 control
      // against 7.1 sustained is not an advantage — one free hero still kills you.
      if (requiresExcess && ourScore < theirScore) continue

      const intensity = (ourScore / 10) * strength * (theirScore / 10)
      const sev = severity(intensity)
      if (!sev) continue

      insights.push({
        type:            'advantage',
        team,
        severity:        sev,
        ourDimension:    ourDim,
        ourScore:        Math.round(ourScore * 10) / 10,
        theirDimension:  theirDim,
        theirScore:      Math.round(theirScore * 10) / 10,
        counterStrength: strength,
        description:      buildNarrative('advantage', ourDim, theirDim),
        debugDescription: `${DIMENSION_LABELS[ourDim]} (${ourScore.toFixed(1)}) counters their ${DIMENSION_LABELS[theirDim]} (${theirScore.toFixed(1)})`,
      })
    }
  }

  // ── Vulnerabilities: their strong dimensions that exploit our weaknesses ────
  for (const [theirDim, edges] of Object.entries(COUNTER_MAP) as [DraftDimension, CounterEdge[]][]) {
    const theirScore = themNorm[theirDim] ?? 0
    if (theirScore < STRONG_THRESHOLD) continue

    for (const { counters: ourDim, strength } of edges) {
      const ourScore = usNorm[ourDim] ?? 0
      if (ourScore > WEAK_THRESHOLD) continue

      const intensity = (theirScore / 10) * strength * (1 - ourScore / 10)
      const sev = severity(intensity)
      if (!sev) continue

      insights.push({
        type:            'vulnerability',
        team,
        severity:        sev,
        ourDimension:    ourDim,
        ourScore:        Math.round(ourScore * 10) / 10,
        theirDimension:  theirDim,
        theirScore:      Math.round(theirScore * 10) / 10,
        counterStrength: strength,
        description:      buildNarrative('vulnerability', ourDim, theirDim),
        debugDescription: `Their ${DIMENSION_LABELS[theirDim]} (${theirScore.toFixed(1)}) exploits your weak ${DIMENSION_LABELS[ourDim]} (${ourScore.toFixed(1)})`,
      })
    }
  }

  return insights.sort((a, b) => {
    const sOrd = { critical: 0, notable: 1, minor: 2 }
    return sOrd[a.severity] - sOrd[b.severity]
  })
}

export function analyzeMatchup(
  radiant: TeamProfile,
  dire:    TeamProfile
): MatchupAnalysis {
  const { radiantNorm, direNorm } = buildSharedScores(radiant, dire)

  const radiantInsights = analyzeOneSide(radiantNorm, direNorm, 'radiant')
  const direInsights    = analyzeOneSide(direNorm, radiantNorm, 'dire')

  const allInsights = [...radiantInsights, ...direInsights]

  let radiantEdge = 0
  for (const i of allInsights) {
    const sign     = i.team === 'radiant' ? 1 : -1
    const typeSign = i.type === 'advantage' ? 1 : -1
    const intensity = (i.ourScore / 10) * i.counterStrength * (i.theirScore / 10)
    radiantEdge   += sign * typeSign * intensity
  }

  radiantEdge = Math.round(radiantEdge * 100) / 100

  const overallFavored: 'radiant' | 'dire' | 'even' =
    radiantEdge >  0.15 ? 'radiant' :
    radiantEdge < -0.15 ? 'dire'    : 'even'

  // Urgency — computed from each team's own perspective.
  // radiantEdge is positive when Radiant is favored, so Dire's edge is the inverse.
  const radiantTimingScore = radiant.heroes.length > 0
    ? radiant.heroes.reduce((s, h) => s + h.timing.score, 0) / radiant.heroes.length
    : 0
  const direTimingScore = dire.heroes.length > 0
    ? dire.heroes.reduce((s, h) => s + h.timing.score, 0) / dire.heroes.length
    : 0

  const radiantUrgency = computeTeamUrgency(radiantEdge, radiantTimingScore)
  const direUrgency    = computeTeamUrgency(-radiantEdge, direTimingScore)

  return { insights: allInsights, radiantEdge, overallFavored, radiantUrgency, direUrgency }
}
