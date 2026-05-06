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
  hard_control: [
    { counters: 'sustained_damage', strength: 0.40, requiresExcess: true },
    { counters: 'burst_damage',     strength: 0.10, requiresExcess: true },
    { counters: 'mobility',         strength: 0.35, requiresExcess: true },
    { counters: 'objective_pressure',             strength: 0.25 },
    { counters: 'defensive_utility', strength: 0.20 },
  ],
  soft_control: [
    { counters: 'sustained_damage', strength: 0.10, requiresExcess: true },
    { counters: 'burst_damage',     strength: 0.05, requiresExcess: true },
    { counters: 'mobility',         strength: 0.15, requiresExcess: true },
    { counters: 'objective_pressure',             strength: 0.10 },
    { counters: 'defensive_utility', strength: 0.05 },
  ],

  // ── Reach ─────────────────────────────────────────────────────────────────
  reach: [
    { counters: 'mobility',         strength: 0.30 },
  ],

  // ── Waveclear ─────────────────────────────────────────────────────────────
  waveclear: [
    { counters: 'objective_pressure', strength: 0.40 },
  ],

  // ── Objective Pressure ────────────────────────────────────────────────────
  objective_pressure: [
    { counters: 'teamfight',        strength: 0.65 },
    { counters: 'map_presence',     strength: 0.40 },
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
    { counters: 'sustained_damage', strength: 0.25, requiresExcess: true },
    { counters: 'objective_pressure', strength: 0.30 },
    { counters: 'map_presence',     strength: 0.60 },
  ],

  // ── Teamfight ─────────────────────────────────────────────────────────────
  teamfight: [
    { counters: 'map_presence',     strength: 0.25 },
    { counters: 'burst_damage',     strength: 0.25 },
    { counters: 'sustained_damage', strength: 0.40, requiresExcess: true },  // teamfight must dominate to force carries off
    { counters: 'objective_pressure', strength: 1.0 },
    { counters: 'mobility',         strength: 0.35 },
  ],

  // ── Mobility ──────────────────────────────────────────────────────────────
  mobility: [
    { counters: 'hard_control',     strength: 0.25 },
    { counters: 'soft_control',     strength: 0.15 },
    { counters: 'pickoff',          strength: 0.40 },
  ],

  // ── Map presence ──────────────────────────────────────────────────────────
  map_presence: [
    { counters: 'pickoff',          strength: 0.30 },
    { counters: 'teamfight',          strength: 0.70 },
  ],

  // ── Defensive utility ─────────────────────────────────────────────────────
  defensive_utility: [
    { counters: 'hard_control',     strength: 0.15 },
    { counters: 'soft_control',     strength: 0.20 },
    { counters: 'burst_damage',     strength: 0.35 },
    { counters: 'pickoff',          strength: 0.20 },
  ],

  // ── Vision control ────────────────────────────────────────────────────────
  vision_control: [
    { counters: 'pickoff',          strength: 0.60 },
    { counters: 'map_presence',     strength: 0.40 },
  ],

  // ── Utility ────────────────────────────────────────────────────────
  spell_uptime: [
    { counters: 'spell_uptime',     strength: 0.20, requiresExcess: true },
    { counters: 'sustained_damage', strength: 0.20 },
    { counters: 'defense',          strength: 0.15 },
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
  hard_control: {
    sustained_damage: 'Your hard CC locks down their damage dealers before they can output.',
    burst_damage:     'Your stuns and disables interrupt their burst combos completely.',
    mobility:         'Your hard lockdown catches mobile heroes mid-escape.',
    objective_pressure: 'Your hard CC holds the line and picks off pushers.',
    defensive_utility:'Your stuns go through before their reactive tools can respond.',
  },
  soft_control: {
    sustained_damage: 'Your slows and roots limit their damage dealers\' freedom.',
    burst_damage:     'Your silences and disarms delay their burst timing.',
    mobility:         'Your soft disables slow their rotations and escapes.',
    objective_pressure: 'Your soft CC disrupts their push coordination.',
    defensive_utility:'Your silences prevent them from casting defensive spells.',
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
    objective_pressure: 'You can eliminate isolated pushers before they do structural damage.',
    map_presence:     'You punish heroes that overextend across the map.',
    sustained_damage: 'Your pick potential eliminates their damage dealers before they can output in fights.',
  },
  reach: {
    mobility:         'Your range keeps mobile heroes at a distance.',
    pickoff:          'You can strike from safety before they can close the gap.',
  },
  waveclear: {
    objective_pressure: 'You clear waves faster than they can siege.',
  },
  objective_pressure: {
    teamfight:        'You can split push and force them to respond rather than fight.',
    map_presence:     'Your pushing pressure collapses their map control over time.',
  },
  teamfight: {
    map_presence:     'Your team fights better as a unit, negating their spread map game.',
    burst_damage:     'Your team synergy blunts isolated burst attempts.',
    sustained_damage: 'Your grouped strength overwhelms their damage output in fights.',
    objective_pressure: 'You can force a fight and collapse their push attempts.',
    mobility:         'Your fight presence denies their divers an easy escape.',
  },
  mobility: {
    hard_control:     'Your movement tools help dodge or reposition around their lockdown.',
    soft_control:     'Your mobility lets you outrun their slows and roots.',
    pickoff:          'Your mobility lets you escape assassination attempts.',
  },
  map_presence: {
    pickoff:          'Your map vision and presence deters lone hunters.',
  },
  defensive_utility: {
    hard_control:     'Your dispels and immunity tools strip their hard CC off teammates.',
    soft_control:     'Your defensive spells cleanse slows and silences from allies.',
    burst_damage:     'Your defensive spells absorb or negate key burst attempts.',
  },
  vision_control: {
    pickoff:          'Your vision coverage exposes their gankers before they strike.',
    map_presence:     'You control information, denying their map presence advantage.',
  },
  spell_uptime: {
    spell_uptime:     'Your abilities cycle faster — you get more casts in every fight window.',
    sustained_damage: 'Your consistent spell pressure disrupts their damage dealers before they can output.',
    defense:          'Your constant ability uptime wears down even durable heroes over time.',
},
}

const VULNERABILITY_NARRATIVE: Partial<Record<DraftDimension, Partial<Record<DraftDimension, string>>>> = {
  defense: {
    burst_damage:     'Without enough tankiness or shields, your heroes crumble to spikes.',
    sustained_damage: 'Your team lacks the armor and durability to survive prolonged fights.',
  },
  hard_control: {
    sustained_damage: 'You lack hard CC to lock down their damage dealers — they output freely.',
    burst_damage:     'Without stuns to interrupt their combos, their burst lands uncontested.',
    mobility:         'Your team can\'t pin down their divers with hard disables.',
    objective_pressure: 'You lack reliable stuns to stop their push dead in its tracks.',
  },
  soft_control: {
    sustained_damage: 'You lack slows and roots to limit their damage dealers\' movement.',
    burst_damage:     'Without silences or disarms, their burst windows go uncontested.',
    mobility:         'Your soft CC isn\'t enough to catch mobile heroes.',
    objective_pressure: 'You can\'t slow their push momentum with your limited soft disables.',
  },
  burst_damage: {
    sustain:          'You lack the kill pressure to cut through their sustain.',
    defense:          'Their durability soaks your nuke damage without breaking a sweat.',
    resource_support: 'You can\'t threaten their supports before they pour out resources.',
  },
  sustained_damage: {
    sustain:          'Your DPS is too slow to outpace their healing.',
    defense:          'Their defense outlasts your damage output in extended fights.',
    pickoff: 'Your damage dealers are vulnerable to being picked off before fights even start.',
  },
  sustain: {
    burst_damage:     'You have no recovery tools — a single burst combo could end a fight.',
    sustained_damage: 'Without sustain, your team bleeds out under constant pressure.',
  },
  pickoff: {
    objective_pressure: 'Your team is vulnerable to getting picked before teamfights start.',
    map_presence:     'Enemy hunters can patrol and isolate your heroes freely.',
  },
  reach: {
    mobility:         'Your team can\'t keep mobile heroes at a distance.',
    pickoff:          'Your short range leaves you exposed to their ranged threats.',
  },
  waveclear: {
    objective_pressure: 'You can\'t clear waves fast enough to stop their siege.',
  },
  objective_pressure: {
    teamfight:        'You can\'t hard push objectives — their teamfight offers formidable resistance.',
    map_presence:     'Your pushing game is too fragile against their wide map control.',
  },
  teamfight: {
    map_presence:     'You struggle to contest their spread, forcing unfavorable fights.',
    burst_damage:     'Their burst can dismantle your team before a fight even begins.',
    sustained_damage: 'Their sustained output keeps grinding your grouped heroes down.',
    objective_pressure: 'Their push threats pull you away from fights you\'re suited for.',
    mobility:         'Their dive heroes scatter your formation before you can react.',
  },
  mobility: {
    hard_control:     'Your team lacks the movement to dodge their hard lockdown.',
    soft_control:     'You can\'t escape their slows and roots once caught.',
    pickoff:          'You can\'t outrun their assassins once isolated.',
  },
  map_presence: {
    pickoff:          'Your vision gaps leave heroes exposed to solo kills.',
  },
  defensive_utility: {
    hard_control:     'You have no way to strip hard disables off your team in fights.',
    soft_control:     'You can\'t cleanse slows and silences when they pile on.',
    burst_damage:     'Your team has no protection against focused burst damage.',
  },
  vision_control: {
    pickoff:          'Blind spots on the map give their hunters easy targets.',
    map_presence:     'You\'re fighting without information — their map game runs unchecked.',
  },
  spell_uptime: {
    spell_uptime:     'Their abilities are always available — you lose the casting battle in extended fights.',
    sustained_damage: 'You lack the spell frequency to disrupt their damage dealers consistently.',
    defense:          'Their relentless ability pressure erodes your durability over time.',
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
  timing: 'early' | 'mid' | 'late',
  enemyTiming: 'early' | 'mid' | 'late'
): string {
  // ── Favored scenarios ────────────────────────────────────────────────────
  if (favored && timing === 'late')
    return 'Play for late — your composition outscales. Farm safely, avoid unnecessary fights, and execute at your power spike.'
  if (favored && timing === 'early' && enemyTiming === 'late')
    return 'You have the window — press the map, take objectives, and close before they scale. Do not let the game stall.'
  if (favored && timing === 'early')
    return 'You have the advantage — control the map, force fights on your terms, and deny them space to recover.'
  if (favored && timing === 'mid')
    return 'Flexible win condition — maintain tempo, respond to threats, and play your game confidently.'

  // ── Unfavored scenarios ──────────────────────────────────────────────────
  if (!favored && timing === 'late' && enemyTiming === 'early')
    return 'Survive the early pressure — your comp outscales if you reach your timing. Trade space for time, avoid overcommitting.'
  if (!favored && timing === 'late')
    return 'Behind but you scale — play defensive, secure farm, and look for a fight at your power spike to turn the game.'
  if (!favored && timing === 'early' && enemyTiming === 'early')
    return 'Must win lanes decisively — both teams peak early but the matchup favors them. Outplay or fall behind permanently.'
  if (!favored && timing === 'early' && enemyTiming === 'late')
    return 'Your window is now — generate kills, take towers, and choke their farm before their scaling kicks in.'
  if (!favored && timing === 'early')
    return 'Must generate leads now — your window is closing and the matchup is against you. Force the pace.'
  if (!favored && timing === 'mid' && enemyTiming === 'late')
    return 'You have a mid-game window before they spike — group up, force objectives, and build an insurmountable lead.'
  if (!favored && timing === 'mid' && enemyTiming === 'early')
    return 'Survive their early aggression — your mid-game is stronger. Play safe until you can turn fights.'

  // Fallback
  return 'Contested matchup — look for picks and plays that tilt the structural balance in your favor.'
}

function timingCategory(score: number): 'early' | 'mid' | 'late' {
  if (score <= -0.15) return 'early'
  if (score >= 0.15)  return 'late'
  return 'mid'
}

export function computeTeamUrgency(
  /** From THIS team's perspective: positive = this team is favored */
  matchupEdgeForThisTeam: number,
  timingScore: number,   // -1 (early) to +1 (late)
  enemyTimingScore: number,  // enemy's timing score
  executionPressure: number = 0  // 0–0.4, how hard it is to convert advantage
): TeamUrgency {
  // Normalize matchup edge to [0, 1] — 1 = fully favored, 0 = fully unfavored.
  // Edge values are typically small floats; scale by 3 to give reasonable spread.
  const matchupFavor  = clamp(0.5 + matchupEdgeForThisTeam * 3, 0, 1)
  // Earlyness: 1 = very early, 0 = very late
  const earlyness     = clamp((1 - timingScore) / 2, 0, 1)

  // Base urgency: unfavored teams feel more urgency, early teams feel more urgency
  let raw = (1 - matchupFavor) * 0.60 + earlyness * 0.40

  // Execution pressure amplifies urgency for favored teams that can't easily convert.
  // A favored early team that can't close feels MORE urgent — their window is slipping.
  // A favored late team that can't survive feels MORE urgent — they might not reach spike.
  raw += executionPressure * 0.50

  const score = Math.round(clamp(raw, 0, 1) * 100) / 100

  const [, label] = URGENCY_LABEL_THRESHOLDS.find(([t]) => score <= t)!

  const favored  = matchupFavor >= 0.5
  const timing   = timingCategory(timingScore)
  const enemyTiming = timingCategory(enemyTimingScore)

  const recommendationBias: RecommendationBias =
    score >= 0.62 ? 'early'    :
    score <= 0.28 ? 'late'     : 'balanced'

  return {
    score,
    label,
    winCondition:       winConditionText(label, favored, timing, enemyTiming),
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

// ── Execution viability ───────────────────────────────────────────────────────
// Measures whether a favored team can actually convert their advantage.
// Does NOT modify the edge — only feeds into urgency amplification.
// Returns a factor 0.6–1.0 where 1.0 = full execution possible, 0.6 = very hard.

const EARLY_THRESHOLD = -0.15
const LATE_THRESHOLD  =  0.15

function earlyVsLateExecution(
  early: Record<DraftDimension, number>,
  late:  Record<DraftDimension, number>
): number {
  const uptimeDelta = (early.spell_uptime - late.spell_uptime) * 0.10

  // Phase 2: Take objectives vs enemy waveclear/defense
  const pushPower = Math.max(
    early.objective_pressure,
    (early.pickoff + early.hard_control) / 2,
    early.teamfight,
    (early.reach + early.objective_pressure) / 2
  )
  const pushResistance = (
    late.waveclear * 0.40 +
    late.defense * 0.30 +
    late.hard_control * 0.30
  )
  const objectiveDelta = pushPower - pushResistance + uptimeDelta

  // Phase 3: Strangle map vs enemy ability to farm safely
  const stranglePower = (
    early.map_presence * 0.20 +
    early.pickoff * 0.25 +
    early.hard_control * 0.20 +
    early.mobility * 0.15 +
    early.vision_control * 0.10 +
    early.reach * 0.10
  )
  const farmSafety = (
    late.mobility * 0.20 +
    late.defensive_utility * 0.25 +
    late.hard_control * 0.20 +
    late.vision_control * 0.10 +
    late.sustain * 0.15 +
    late.reach * 0.10
  )
  const strangleDelta = stranglePower - farmSafety + uptimeDelta

  // Phase 4: Breach high ground vs enemy HG defense
  const breachPower = Math.max(
    early.teamfight,
    (early.pickoff + early.hard_control) / 2,
    (early.reach + early.teamfight) / 2
  )
  const hgDefense = (
    late.waveclear * 0.25 +
    late.teamfight * 0.25 +
    late.hard_control * 0.20 +
    late.defensive_utility * 0.15 +
    late.spell_uptime * 0.15
  )
  const breachDelta = breachPower - hgDefense + uptimeDelta

  const chainMin = Math.min(objectiveDelta, strangleDelta, breachDelta)
  return clamp(0.8 + (chainMin / 5.0) * 0.2, 0.6, 1.0)
}

function lateVsEarlySurvival(
  late:  Record<DraftDimension, number>,
  early: Record<DraftDimension, number>
): number {
  const uptimeDelta = (late.spell_uptime - early.spell_uptime) * 0.10

  // Can they stall objectives?
  const stallPower = (
    late.waveclear * 0.35 +
    late.defense * 0.25 +
    late.hard_control * 0.25 +
    late.defensive_utility * 0.15
  )
  const enemyPush = Math.max(
    early.objective_pressure,
    (early.pickoff + early.hard_control) / 2,
    early.teamfight,
    (early.reach + early.objective_pressure) / 2
  )
  const stallDelta = stallPower - enemyPush + uptimeDelta

  // Can they farm safely?
  const farmPower = (
    late.mobility * 0.20 +
    late.defensive_utility * 0.25 +
    late.hard_control * 0.20 +
    late.vision_control * 0.10 +
    late.sustain * 0.15 +
    late.reach * 0.10
  )
  const enemyStrangle = (
    early.map_presence * 0.20 +
    early.pickoff * 0.25 +
    early.hard_control * 0.20 +
    early.mobility * 0.15 +
    early.vision_control * 0.10 +
    early.reach * 0.10
  )
  const farmDelta = farmPower - enemyStrangle + uptimeDelta

  // Can they hold high ground?
  const hgHold = (
    late.waveclear * 0.25 +
    late.teamfight * 0.25 +
    late.hard_control * 0.20 +
    late.defensive_utility * 0.15 +
    late.spell_uptime * 0.15
  )
  const enemyBreach = Math.max(
    early.teamfight,
    (early.pickoff + early.hard_control) / 2,
    (early.reach + early.teamfight) / 2
  )
  const hgDelta = hgHold - enemyBreach + uptimeDelta

  const chainMin = Math.min(stallDelta, farmDelta, hgDelta)
  return clamp(0.8 + (chainMin / 5.0) * 0.2, 0.6, 1.0)
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

  // ── Execution pressure (bidirectional) ──────────────────────────────────
  // Both teams are evaluated for offensive (can they close?) and defensive
  // (can they stall?) execution. Pressure is high when you can't close AND
  // the enemy can counter-push. Pressure is low when you can't close but
  // they also can't threaten — safe to grind them out.
  let radiantExecPressure = 0
  let direExecPressure = 0

  // Compute all four execution factors
  const radiantOffense = earlyVsLateExecution(radiantNorm, direNorm)  // Radiant push vs Dire stall
  const direOffense    = earlyVsLateExecution(direNorm, radiantNorm)  // Dire push vs Radiant stall
  const radiantDefense = lateVsEarlySurvival(radiantNorm, direNorm)   // Radiant stall vs Dire push
  const direDefense    = lateVsEarlySurvival(direNorm, radiantNorm)   // Dire stall vs Radiant push

  if (radiantEdge > 0.15) {
    // Radiant is favored:
    //   Pressure = how hard to close + can Dire counter-push?
    //   If Dire can't push back, pressure is halved (safe to be patient)
    const cantClose   = 1 - radiantOffense
    const theyCanFlip = Math.max(direOffense - 0.6, 0)
    radiantExecPressure = clamp(cantClose * 0.5 + theyCanFlip * 0.5, 0, 0.4)

    // Dire is unfavored:
    //   Pressure = how hard to stall + can Radiant close fast?
    //   If Radiant can't close, pressure is lower (you have time)
    const cantStall    = 1 - direDefense
    const enemyCloses  = Math.max(radiantOffense - 0.6, 0)
    direExecPressure = clamp(cantStall * 0.5 + enemyCloses * 0.5, 0, 0.4)
  } else if (radiantEdge < -0.15) {
    // Dire is favored:
    const cantClose   = 1 - direOffense
    const theyCanFlip = Math.max(radiantOffense - 0.6, 0)
    direExecPressure = clamp(cantClose * 0.5 + theyCanFlip * 0.5, 0, 0.4)

    // Radiant is unfavored:
    const cantStall    = 1 - radiantDefense
    const enemyCloses  = Math.max(direOffense - 0.6, 0)
    radiantExecPressure = clamp(cantStall * 0.5 + enemyCloses * 0.5, 0, 0.4)
  }

  const radiantUrgency = computeTeamUrgency(radiantEdge, radiantTimingScore, direTimingScore, radiantExecPressure)
  const direUrgency    = computeTeamUrgency(-radiantEdge, direTimingScore, radiantTimingScore, direExecPressure)

  return { insights: allInsights, radiantEdge, overallFavored, radiantUrgency, direUrgency }
}
