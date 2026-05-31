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
    { counters: 'spell_sustained',  strength: 0.06, requiresExcess: true },
    { counters: 'attack_sustained', strength: 0.10, requiresExcess: true },
    { counters: 'pickoff', strength: 0.08, requiresExcess: true },
  ],

  // ── Control ───────────────────────────────────────────────────────────────
  // CC must MATCH OR EXCEED the damage it's trying to lock down. If the enemy
  // has more sustained damage than you have control, one free damage dealer
  // still kills your team. requiresExcess enforces this.
  hard_control: [
    { counters: 'spell_sustained',  strength: 0.30 },
    { counters: 'attack_sustained', strength: 0.50 },
    { counters: 'burst_damage',     strength: 0.40},
    { counters: 'mobility',         strength: 0.40},
    { counters: 'objective_pressure',             strength: 0.25 },
    { counters: 'defensive_utility', strength: 0.35 },
  ],
  soft_control: [
    { counters: 'spell_sustained',  strength: 0.10, requiresExcess: true },
    { counters: 'attack_sustained', strength: 0.05, requiresExcess: true },
    { counters: 'burst_damage',     strength: 0.05, requiresExcess: true },
    { counters: 'mobility',         strength: 0.15, requiresExcess: true },
    { counters: 'objective_pressure',             strength: 0.10 },
    { counters: 'defensive_utility', strength: 0.10 },
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
    { counters: 'spell_sustained',  strength: 0.30 },
    { counters: 'attack_sustained', strength: 0.50 },
    { counters: 'hard_control',     strength: 0.30 },
  ],

  // ── Spell Sustained ────────────────────────────────────────────────────────
  spell_sustained: [
    { counters: 'sustain',          strength: 0.25 },
    { counters: 'defense',          strength: 0.30, requiresExcess: true },
  ],

  // ── Attack Sustained ───────────────────────────────────────────────────────
  attack_sustained: [
    { counters: 'sustain',          strength: 0.35 },
    { counters: 'defense',          strength: 0.40, requiresExcess: true },
  ],

  // ── Sustain ───────────────────────────────────────────────────────────────
  sustain: [
    { counters: 'burst_damage',     strength: 0.60, requiresExcess: true },
    { counters: 'spell_sustained',  strength: 0.40, requiresExcess: true },
    { counters: 'attack_sustained', strength: 0.50, requiresExcess: true },
  ],

  // ── Pickoff ───────────────────────────────────────────────────────────────
  pickoff: [
    { counters: 'spell_sustained',  strength: 0.35 },
    { counters: 'attack_sustained', strength: 0.45 },
    { counters: 'burst_damage', strength: 0.35 },
    { counters: 'objective_pressure', strength: 0.25 },
    { counters: 'map_presence',     strength: 0.50 },
  ],

  // ── Teamfight ─────────────────────────────────────────────────────────────
  teamfight: [
    { counters: 'map_presence',     strength: 0.25 },
    { counters: 'burst_damage',     strength: 0.25 },
    { counters: 'spell_sustained',  strength: 0.30, requiresExcess: true },
    { counters: 'attack_sustained', strength: 0.40, requiresExcess: true },
    { counters: 'objective_pressure', strength: 1.0 },
    { counters: 'mobility',         strength: 0.35 },
  ],

  // ── Mobility ──────────────────────────────────────────────────────────────
  mobility: [
    { counters: 'hard_control', strength: 0.20 },
    { counters: 'soft_control', strength: 0.30 },
  ],

  // ── Map presence ──────────────────────────────────────────────────────────
  map_presence: [
    { counters: 'pickoff',          strength: 0.30 },
    { counters: 'teamfight',          strength: 0.70 },
  ],

  // ── Defensive utility ─────────────────────────────────────────────────────
  defensive_utility: [
    { counters: 'hard_control',     strength: 0.60 },
    { counters: 'soft_control',     strength: 0.25 },
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
    spell_sustained:  'Your team\'s durability lets them endure extended spell pressure.',
    attack_sustained: 'Your team\'s durability lets them endure prolonged right-click pressure.',
  },
  hard_control: {
    spell_sustained:  'Your hard CC locks down their spell-based damage dealers before they can output.',
    attack_sustained: 'Your hard CC locks down their right-click damage dealers before they can output.',
    burst_damage:     'Your stuns and disables interrupt their burst combos completely.',
    mobility:         'Your hard lockdown catches mobile heroes mid-escape.',
    objective_pressure: 'Your hard CC holds the line and picks off pushers.',
    defensive_utility:'Your stuns go through before their reactive tools can respond.',
  },
  soft_control: {
    spell_sustained:  'Your slows and roots limit their spell-based damage dealers\' freedom.',
    attack_sustained: 'Your slows and roots limit their right-click damage dealers\' freedom.',
    burst_damage:     'Your silences and disarms delay their burst timing.',
    mobility:         'Your soft disables slow their rotations and escapes.',
    objective_pressure: 'Your soft CC disrupts their push coordination.',
    defensive_utility:'Your silences prevent them from casting defensive spells.',
  },
  burst_damage: {
    sustain:          'Your burst kills faster than their healing can respond.',
    defense:          'Your nukes punch through their tankiness in a single window.',
    resource_support: 'Your burst eliminates their backline before they can provide support.',
    spell_sustained:  'Your burst eliminates their spell-based damage dealers before they can ramp up.',
    attack_sustained: 'Your burst eliminates their right-click damage dealers before they can ramp up.',
  },
  spell_sustained: {
    sustain:          'Your spell-based damage overwhelms their regen over time.',
    defense:          'Your persistent spell damage wears down even the toughest defenders.',
  },
  attack_sustained: {
    sustain:          'Your right-click pressure overwhelms their regen over time.',
    defense:          'Your persistent right-click damage wears down even the toughest defenders.',
  },
  sustain: {
    burst_damage:     'Your healing and regen outlast their burst windows.',
    spell_sustained:  'Your sustain keeps your team alive through extended spell fights.',
    attack_sustained: 'Your sustain keeps your team alive through prolonged right-click fights.',
  },
  pickoff: {
    objective_pressure: 'You can eliminate isolated pushers before they do structural damage.',
    map_presence:     'You punish heroes that overextend across the map.',
    spell_sustained:  'Your pick potential eliminates their spell-based damage dealers before they can output.',
    attack_sustained: 'Your pick potential eliminates their right-click damage dealers before they can output.',
    burst_damage:     'Your pick off catches their bursty spell casters and divers off guard'
  },
  reach: {
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
    spell_sustained:  'Your grouped strength overwhelms their spell-based damage output in fights.',
    attack_sustained: 'Your grouped strength overwhelms their right-click damage output in fights.',
    objective_pressure: 'You can force a fight and collapse their push attempts.',
    mobility:         'Your fight presence denies their divers an easy escape.',
  },
  mobility: {
    hard_control:     'Your mobility lets you dodge or escape their hard lockdown.',
    soft_control:     'Your mobility lets you outrun their slows and roots.',
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
    defense:          'Your constant ability uptime wears down even durable heroes over time.',
},
}

const VULNERABILITY_NARRATIVE: Partial<Record<DraftDimension, Partial<Record<DraftDimension, string>>>> = {
  defense: {
    burst_damage:     'Without enough tankiness or shields, your heroes crumble to spikes.',
    spell_sustained:  'Your team lacks the armor and durability to survive prolonged spell pressure.',
    attack_sustained: 'Your team lacks the armor and durability to survive prolonged right-click pressure.',
  },
  hard_control: {
    spell_sustained:  'You lack hard CC to lock down their spell-based damage dealers — they output freely.',
    attack_sustained: 'You lack hard CC to lock down their right-click damage dealers — they output freely.',
    burst_damage:     'Without stuns to interrupt their combos, their burst lands uncontested.',
    mobility:         'Your team can\'t pin down their divers with hard disables.',
    objective_pressure: 'You lack reliable stuns to stop their push dead in its tracks.',
  },
  soft_control: {
    spell_sustained:  'You lack slows and roots to limit their spell-based damage dealers\' movement.',
    attack_sustained: 'You lack slows and roots to limit their right-click damage dealers\' movement.',
    burst_damage:     'Without silences or disarms, their burst windows go uncontested.',
    mobility:         'Your soft CC isn\'t enough to catch mobile heroes.',
    objective_pressure: 'You can\'t slow their push momentum with your limited soft disables.',
  },
  burst_damage: {
    sustain:          'You lack the kill pressure to cut through their sustain.',
    defense:          'Their durability soaks your nuke damage without breaking a sweat.',
    resource_support: 'You can\'t threaten their supports before they pour out resources.',
    spell_sustained:  'Your burst can\'t eliminate their spell-based damage dealers before they ramp up.',
    attack_sustained: 'Your burst can\'t eliminate their right-click damage dealers before they ramp up.',
  },
  spell_sustained: {
    sustain:          'Your spell-based DPS is too slow to outpace their healing.',
    defense:          'Their defense outlasts your spell-based damage output in extended fights.',
    pickoff:          'Your spell-based damage dealers are vulnerable to being picked off before fights even start.',
    burst_damage:     'Your spell-based damage dealers die to burst before they can ramp up meaningful DPS.',
    hard_control:     'Your spell-based damage dealers get locked down and can\'t output — they die before contributing.',
  },
  attack_sustained: {
    sustain:          'Your right-click DPS is too slow to outpace their healing.',
    defense:          'Their defense outlasts your right-click damage output in extended fights.',
    pickoff:          'Your right-click damage dealers are vulnerable to being picked off before fights even start.',
    burst_damage:     'Your right-click damage dealers die to burst before they can ramp up meaningful DPS.',
    hard_control:     'Your right-click damage dealers get locked down and can\'t output — they die before contributing.',
  },
  sustain: {
    burst_damage:     'You have no recovery tools — a single burst combo could end a fight.',
    spell_sustained:  'Without sustain, your team bleeds out under constant spell pressure.',
    attack_sustained: 'Without sustain, your team bleeds out under constant right-click pressure.',
  },
  pickoff: {
    objective_pressure: 'Your team is vulnerable to getting picked before teamfights start.',
    map_presence:     'Enemy hunters can patrol and isolate your heroes freely.',
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
    spell_sustained:  'Their spell-based sustained output keeps grinding your grouped heroes down.',
    attack_sustained: 'Their right-click sustained output keeps grinding your grouped heroes down.',
    objective_pressure: 'Their push threats pull you away from fights you\'re suited for.',
    mobility:         'Their dive heroes scatter your formation before you can react.',
  },
  mobility: {
    hard_control:     'Your team lacks the movement to dodge their hard lockdown.',
    soft_control:     'You can\'t escape their slows and roots once caught.',
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
  effectiveEdge:  number
  continuousEdge: number
  overallFavored: 'radiant_slightly' | 'radiant' | 'radiant_strongly' | 'dire_slightly' | 'dire' | 'dire_strongly' | 'even'
  radiantUrgency: TeamUrgency
  direUrgency:    TeamUrgency
  executionVolatility: number  // width of two-scenario range
  rangeA:         number       // final edge if Radiant leads early
  rangeB:         number       // final edge if Dire leads early
  executionDebug?: {
    structuralEdge: number
    radiantObjDelta: number
    radiantStrangleDelta: number
    radiantBreachDelta: number
    radiantSkirmishDelta: number
    direObjDelta: number
    direStrangleDelta: number
    direBreachDelta: number
    direSkirmishDelta: number
    objectiveSwingA: number
    strangleSwingA: number
    breachSwingA: number
    skirmishSwingA: number
    objectiveSwingB: number
    strangleSwingB: number
    breachSwingB: number
    skirmishSwingB: number
    scenarioA: number
    scenarioB: number
  }
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
  scenarioShiftForThisTeam = 0
): TeamUrgency {
  // Normalize matchup edge to [0, 1] — 1 = fully favored, 0 = fully unfavored.
  // Edge values are typically small floats; scale by 3 to give reasonable spread.
  const matchupFavor  = clamp(0.5 + matchupEdgeForThisTeam * 3, 0, 1)
  // Earlyness: 1 = very early, 0 = very late
  const earlyness     = clamp((1 - timingScore) / 2, 0, 1)

  // Urgency is driven by favor, timing, and how much more comfortable the team's
  // better scenario is versus its worse scenario. Positive shift = safer path.
  const shiftPressure = clamp(-scenarioShiftForThisTeam * 0.35, -0.20, 0.20)
  const raw = (1 - matchupFavor) * 0.55 + earlyness * 0.35 + shiftPressure * 0.10

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
      const theirScore = themNorm[theirDim] ?? 0
      
      // Ratio override: if their damage is more than 2× our survivability, it's a vulnerability
      // regardless of absolute threshold. This catches cases where low survivability gets
      // overwhelmed by extreme damage (e.g., 4 sustain vs 10 burst).
      const isSurvivabilityDim = ourDim === 'sustain' || ourDim === 'defense' || ourDim === 'defensive_utility'
      const isDamageDim = theirDim === 'burst_damage' || theirDim === 'spell_sustained' || theirDim === 'attack_sustained' || theirDim === 'pickoff'
      const ratioOverride = isSurvivabilityDim && isDamageDim && theirScore > ourScore * 2
      
      if (ourScore > WEAK_THRESHOLD && !ratioOverride) continue

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
// Measures whether a team can actually convert advantages or survive pressure.
// Does NOT modify the edge — only feeds into urgency amplification.
// Returns a factor 0.6–1.0 where 1.0 = full execution possible, 0.6 = very hard.
// Always computed for both teams regardless of timing — every game is an execution test.

function closingPower(
  attacker: Record<DraftDimension, number>,
  defender: Record<DraftDimension, number>
): number {
  const uptimeDelta = (attacker.spell_uptime - defender.spell_uptime) * 0.10

  // Phase 2: Take objectives vs enemy waveclear/defense
  const pushPower = Math.max(
    attacker.objective_pressure,
    (attacker.pickoff + attacker.hard_control) / 2,
    attacker.teamfight,
    (attacker.reach + attacker.objective_pressure) / 2
  )
  const pushResistance = (
    defender.waveclear * 0.40 +
    defender.defense * 0.30 +
    defender.hard_control * 0.30
  )
  const objectiveDelta = pushPower - pushResistance + uptimeDelta

  // Phase 3: Strangle map vs enemy ability to farm safely
  const stranglePower = (
    attacker.map_presence * 0.20 +
    attacker.pickoff * 0.25 +
    attacker.hard_control * 0.20 +
    attacker.mobility * 0.15 +
    attacker.vision_control * 0.10 +
    attacker.reach * 0.10
  )
  const farmSafety = (
    defender.mobility * 0.20 +
    defender.defensive_utility * 0.25 +
    defender.hard_control * 0.20 +
    defender.vision_control * 0.10 +
    defender.sustain * 0.15 +
    defender.reach * 0.10
  )
  const strangleDelta = stranglePower - farmSafety + uptimeDelta

  // Phase 4: Breach high ground vs enemy HG defense
  const breachPower = Math.max(
    attacker.teamfight,
    (attacker.pickoff + attacker.hard_control) / 2,
    (attacker.reach + attacker.teamfight) / 2
  )
  const hgDefense = (
    defender.waveclear * 0.25 +
    defender.teamfight * 0.25 +
    defender.hard_control * 0.20 +
    defender.defensive_utility * 0.15 +
    defender.spell_uptime * 0.15
  )
  const breachDelta = breachPower - hgDefense + uptimeDelta

  const chainMin = Math.min(objectiveDelta, strangleDelta, breachDelta)
  return clamp(0.8 + (chainMin / 5.0) * 0.2, 0.6, 1.0)
}

function stallingPower(
  defender: Record<DraftDimension, number>,
  attacker: Record<DraftDimension, number>
): number {
  const uptimeDelta = (defender.spell_uptime - attacker.spell_uptime) * 0.10

  // Can they stall objectives?
  const stallPower = (
    defender.waveclear * 0.35 +
    defender.defense * 0.25 +
    defender.hard_control * 0.25 +
    defender.defensive_utility * 0.15
  )
  const enemyPush = Math.max(
    attacker.objective_pressure,
    (attacker.pickoff + attacker.hard_control) / 2,
    attacker.teamfight,
    (attacker.reach + attacker.objective_pressure) / 2
  )
  const stallDelta = stallPower - enemyPush + uptimeDelta

  // Can they farm safely?
  const farmPower = (
    defender.mobility * 0.20 +
    defender.defensive_utility * 0.25 +
    defender.hard_control * 0.20 +
    defender.vision_control * 0.10 +
    defender.sustain * 0.15 +
    defender.reach * 0.10
  )
  const enemyStrangle = (
    attacker.map_presence * 0.20 +
    attacker.pickoff * 0.25 +
    attacker.hard_control * 0.20 +
    attacker.mobility * 0.15 +
    attacker.vision_control * 0.10 +
    attacker.reach * 0.10
  )
  const farmDelta = farmPower - enemyStrangle + uptimeDelta

  // Can they hold high ground?
  const hgHold = (
    defender.waveclear * 0.25 +
    defender.teamfight * 0.25 +
    defender.hard_control * 0.20 +
    defender.defensive_utility * 0.15 +
    defender.spell_uptime * 0.15
  )
  const enemyBreach = Math.max(
    attacker.teamfight,
    (attacker.pickoff + attacker.hard_control) / 2,
    (attacker.reach + attacker.teamfight) / 2
  )
  const hgDelta = hgHold - enemyBreach + uptimeDelta

  const chainMin = Math.min(stallDelta, farmDelta, hgDelta)
  return clamp(0.8 + (chainMin / 5.0) * 0.2, 0.6, 1.0)
}

function phaseSwing(delta: number, divisor = 8, cap = 1): number {
  return clamp(delta / divisor, -cap, cap)
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

  const structuralEdge = radiantEdge

  // ── Execution two-scenario range ──────────────────────────────────────────
  // Each phase produces a raw signed delta. We run two scenarios:
  // Scenario A: Radiant has early lead → Radiant executes close phases, Dire executes stall phases
  // Scenario B: Dire has early lead → Dire executes close phases, Radiant executes stall phases
  //
  // Closing phases (positive contribution when executing well): objectiveDelta, strangleDelta, breachDelta
  // Stalling phases (negative contribution when executing well): stallDelta, farmDelta, hgDelta

  // Raw phase deltas from composites only, kept on a single scale.
  const radiantPushPower = Math.max(
    radiantNorm.objective_pressure,
    (radiantNorm.pickoff + (radiantNorm.hard_control + radiantNorm.soft_control * 0.5)) / 2,
    radiantNorm.teamfight
  )
  const direPushPower = Math.max(
    direNorm.objective_pressure,
    (direNorm.pickoff + (direNorm.hard_control + direNorm.soft_control * 0.5)) / 2,
    direNorm.teamfight
  )
  const radiantBreachPower = Math.max(
    radiantNorm.teamfight,
    (radiantNorm.pickoff + (radiantNorm.hard_control + radiantNorm.soft_control * 0.5)) / 2
  )
  const direBreachPower = Math.max(
    direNorm.teamfight,
    (direNorm.pickoff + (direNorm.hard_control + direNorm.soft_control * 0.5)) / 2
  )


  const radiantObjDelta  = radiantPushPower - (direNorm.waveclear * 0.25 + (direNorm.hard_control * 0.30 + direNorm.soft_control * 0.20) + direNorm.sustain * 0.15)
  const radiantStrangleDelta = (radiantNorm.map_presence * 0.25 + radiantNorm.pickoff * 0.25 + radiantNorm.hard_control * 0.15 + radiantNorm.soft_control * 0.10 + radiantNorm.mobility * 0.15 + radiantNorm.vision_control * 0.10) - (direNorm.mobility * 0.15 + direNorm.defensive_utility * 0.15 + direNorm.hard_control * 0.15 + direNorm.soft_control * 0.10 + direNorm.vision_control * 0.10 + direNorm.sustain * 0.10 + direNorm.defense * 0.10 + direNorm.reach * 0.05 + direNorm.map_presence * 0.10)
  const radiantBreachDelta = radiantBreachPower - (direNorm.waveclear * 0.30 + direNorm.teamfight * 0.20 + (direNorm.hard_control * 0.25 + direNorm.soft_control * 0.20) + direNorm.defensive_utility * 0.20 + direNorm.reach * 0.15 + direNorm.vision_control * 0.10)
  const radiantSkirmishDelta = (radiantNorm.attack_sustained * 0.25 + radiantNorm.spell_sustained * 0.20 + radiantNorm.burst_damage * 0.15 + radiantNorm.spell_uptime * 0.10 + radiantNorm.hard_control * 0.15 + radiantNorm.soft_control * 0.10 + radiantNorm.mobility * 0.05) - (direNorm.defense * 0.20 + direNorm.sustain * 0.20 + direNorm.hard_control * 0.15 + direNorm.soft_control * 0.10 + direNorm.defensive_utility * 0.20 + direNorm.mobility * 0.15)

  const direObjDelta    = direPushPower - (radiantNorm.waveclear * 0.25 + (radiantNorm.hard_control * 0.30 + radiantNorm.soft_control * 0.20) + radiantNorm.sustain * 0.15)
  const direStrangleDelta = (direNorm.map_presence * 0.25 + direNorm.pickoff * 0.25 + direNorm.hard_control * 0.15 + direNorm.soft_control * 0.10 + direNorm.mobility * 0.15 + direNorm.vision_control * 0.10) - (radiantNorm.mobility * 0.15 + radiantNorm.defensive_utility * 0.15 + radiantNorm.hard_control * 0.15 + radiantNorm.soft_control * 0.10 + radiantNorm.vision_control * 0.10 + radiantNorm.sustain * 0.10 + radiantNorm.defense * 0.10 + radiantNorm.reach * 0.05 + radiantNorm.map_presence * 0.10)
  const direBreachDelta = direBreachPower - (radiantNorm.waveclear * 0.30 + radiantNorm.teamfight * 0.20 + (radiantNorm.hard_control * 0.25 + radiantNorm.soft_control * 0.20) + radiantNorm.defensive_utility * 0.20 + radiantNorm.reach * 0.15 + radiantNorm.vision_control * 0.10)
  const direSkirmishDelta = (direNorm.attack_sustained * 0.25 + direNorm.spell_sustained * 0.20 + direNorm.burst_damage * 0.15 + direNorm.spell_uptime * 0.10 + direNorm.hard_control * 0.15 + direNorm.soft_control * 0.10 + direNorm.mobility * 0.05) - (radiantNorm.defense * 0.20 + radiantNorm.sustain * 0.20 + radiantNorm.hard_control * 0.15 + radiantNorm.soft_control * 0.10 + radiantNorm.defensive_utility * 0.20 + radiantNorm.mobility * 0.15)


  const objectiveSwingA = phaseSwing(radiantObjDelta)
  const strangleSwingA  = phaseSwing(radiantStrangleDelta)
  const breachSwingA    = phaseSwing(radiantBreachDelta)
  const skirmishSwingA    = phaseSwing(radiantSkirmishDelta)

  const objectiveSwingB = -phaseSwing(direObjDelta)
  const strangleSwingB  = -phaseSwing(direStrangleDelta)
  const breachSwingB    = -phaseSwing(direBreachDelta)
  const skirmishSwingB    = -phaseSwing(direSkirmishDelta)

  // Scenario A: Radiant leads early → small signed edge-scale swings
  const scenarioA = objectiveSwingA + strangleSwingA + breachSwingA + skirmishSwingA
  // Scenario B: Dire leads early → small signed edge-scale swings on the same axis
  const scenarioB = objectiveSwingB + strangleSwingB + breachSwingB + skirmishSwingB

  // Two-scenario range for display
  const rangeA = structuralEdge + scenarioA
  const rangeB = structuralEdge + scenarioB
  const verdictRangeA = clamp(rangeA, -1, 1)
  const verdictRangeB = clamp(rangeB, -1, 1)

  // Effective edge: use midpoint only when both outcomes stay on one side.
  const minRange = Math.min(verdictRangeA, verdictRangeB)
  const maxRange = Math.max(verdictRangeA, verdictRangeB)
  const midpoint = (verdictRangeA + verdictRangeB) / 2
  const executionVolatility = Math.abs(rangeA - rangeB)
  let effectiveEdge: number

  const bucketOf = (value: number) => {
    if (value >= 0.80) return 'radiant_strongly' as const
    if (value >= 0.40) return 'radiant' as const
    if (value >  0.20) return 'radiant_slightly' as const
    if (value <= -0.80) return 'dire_strongly' as const
    if (value <= -0.40) return 'dire' as const
    if (value <  -0.20) return 'dire_slightly' as const
    return 'even' as const
  }

  const downgradeBucket = (
    bucket: 'radiant_strongly' | 'radiant' | 'radiant_slightly' | 'dire_strongly' | 'dire' | 'dire_slightly' | 'even'
  ): number => {
    switch (bucket) {
      case 'radiant_strongly': return 0.60
      case 'radiant':          return 0.30
      case 'radiant_slightly': return 0.30
      case 'dire_strongly':    return -0.60
      case 'dire':             return -0.30
      case 'dire_slightly':    return -0.30
      default:                 return 0
    }
  }

  const bucketA = bucketOf(verdictRangeA)
  const bucketB = bucketOf(verdictRangeB)
  const aIsEven = bucketA === 'even'
  const bIsEven = bucketB === 'even'
  const splitAcrossTeams =
    (verdictRangeA > 0.20 && verdictRangeB < -0.20) ||
    (verdictRangeB > 0.20 && verdictRangeA < -0.20)

  if (splitAcrossTeams || (aIsEven && bIsEven)) {
    effectiveEdge = 0
  } else if (aIsEven !== bIsEven) {
    effectiveEdge = downgradeBucket(aIsEven ? bucketB : bucketA)
  } else {
    effectiveEdge = midpoint
  }

  radiantEdge = Math.round(structuralEdge * 100) / 100
  effectiveEdge = Math.round(effectiveEdge * 100) / 100
  const continuousEdge = Math.round(((rangeA + rangeB) / 2) * 100) / 100

  const overallFavoredShifted: MatchupAnalysis['overallFavored'] =
    effectiveEdge >=  0.80 ? 'radiant_strongly' :
    effectiveEdge >=  0.40 ? 'radiant'          :
    effectiveEdge >   0.20 ? 'radiant_slightly' :
    effectiveEdge <= -0.80 ? 'dire_strongly'    :
    effectiveEdge <= -0.40 ? 'dire'             :
    effectiveEdge <  -0.20 ? 'dire_slightly'    : 'even'

  const radiantScenarioShift = rangeA - rangeB
  const direScenarioShift    = rangeB - rangeA
  const radiantUrgency = computeTeamUrgency(effectiveEdge, radiantTimingScore, direTimingScore, radiantScenarioShift)
  const direUrgency    = computeTeamUrgency(-effectiveEdge, direTimingScore, radiantTimingScore, direScenarioShift)

  return {
    insights: allInsights,
    radiantEdge,
    effectiveEdge,
    continuousEdge,
    overallFavored: overallFavoredShifted,
    radiantUrgency,
    direUrgency,
    executionVolatility,
    rangeA,
    rangeB,
    executionDebug: {
      structuralEdge,
      radiantObjDelta,
      radiantStrangleDelta,
      radiantBreachDelta,
      radiantSkirmishDelta,
      direObjDelta,
      direStrangleDelta,
      direBreachDelta,
      direSkirmishDelta,
      objectiveSwingA,
      strangleSwingA,
      breachSwingA,
      skirmishSwingA,
      objectiveSwingB,
      strangleSwingB,
      breachSwingB,
      skirmishSwingB,
      scenarioA,
      scenarioB,
    }
  }
}
