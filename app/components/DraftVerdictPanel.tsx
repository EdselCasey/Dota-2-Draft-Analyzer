'use client'

import type { MatchupAnalysis } from '../../lib/matchup'
import { URGENCY_COLORS } from '../../lib/matchup'
import type { TimingResult } from '../../lib/timing'
import { TIMING_LABEL_COLORS } from '../../lib/timing'

interface DraftVerdictPanelProps {
  matchup:       MatchupAnalysis | null
  radiantTiming: TimingResult    | null
  direTiming:    TimingResult    | null
  radiantCount:  number
  direCount:     number
}

function verdictSubtitle(
  favored: 'radiant' | 'dire' | 'even',
  radiantTiming: TimingResult | null,
  direTiming:    TimingResult | null,
): string {
  if (favored === 'even') return 'Closely Contested — no clear structural edge'
  const t = favored === 'radiant' ? radiantTiming?.label : direTiming?.label
  if (t === 'Early Game' || t === 'Early-Mid') return 'Early–mid dominance — can control and close the map'
  if (t === 'Late Game'  || t === 'Mid-Late' ) return 'Farm to your power spike and scale to win'
  return 'Maintain pressure and respond to threats'
}

export default function DraftVerdictPanel({
  matchup,
  radiantTiming,
  direTiming,
  radiantCount,
  direCount,
}: DraftVerdictPanelProps) {
  const hasRadiant = radiantCount > 0
  const hasDire    = direCount    > 0

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!hasRadiant && !hasDire) {
    return (
      <div className="shrink-0 mx-3 mt-3 px-4 py-3 rounded-lg border border-white/8 bg-white/[0.02] flex items-center justify-center">
        <span className="text-white/25 text-xs tracking-wide">
          Add heroes to both teams to begin analysis
        </span>
      </div>
    )
  }

  // ── Partial state (one team only) ─────────────────────────────────────────
  if (!hasRadiant || !hasDire) {
    const presentTeam   = hasRadiant ? 'Radiant' : 'Dire'
    const presentTiming = hasRadiant ? radiantTiming : direTiming
    const accentColor   = hasRadiant ? '#4ade80' : '#f87171'

    return (
      <div className="shrink-0 mx-3 mt-3 px-4 py-3 rounded-lg border border-white/8 bg-white/[0.02] flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold" style={{ color: accentColor }}>
            {presentTeam}
          </span>
          {presentTiming && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded"
              style={{
                color:           TIMING_LABEL_COLORS[presentTiming.label],
                backgroundColor: TIMING_LABEL_COLORS[presentTiming.label] + '22',
                border:          `1px solid ${TIMING_LABEL_COLORS[presentTiming.label]}44`,
              }}
            >
              {presentTiming.label}
            </span>
          )}
        </div>
        <span className="text-white/25 text-xs ml-auto">Waiting for opponent picks…</span>
      </div>
    )
  }

  // ── Full state ────────────────────────────────────────────────────────────
  if (!matchup) return null

  const { overallFavored, radiantUrgency, direUrgency } = matchup

  const verdictText =
    overallFavored === 'radiant' ? 'Radiant Favored' :
    overallFavored === 'dire'    ? 'Dire Favored'    : 'Even Matchup'

  const verdictColor =
    overallFavored === 'radiant' ? '#4ade80' :
    overallFavored === 'dire'    ? '#f87171' : '#94a3b8'

  const subtitle = verdictSubtitle(overallFavored, radiantTiming, direTiming)

  return (
    <div className="shrink-0 mx-3 mt-3 rounded-lg border border-white/8 bg-white/[0.02] overflow-hidden">
      {/* Row 1: Verdict + Timing */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {/* Verdict */}
        <div className="flex flex-col gap-0.5 mr-2">
          <span
            className="text-base font-black leading-tight tracking-tight"
            style={{ color: verdictColor, textShadow: `0 0 20px ${verdictColor}66` }}
          >
            {verdictText}
          </span>
          <span className="text-[10px] text-white/40 leading-tight">{subtitle}</span>
        </div>

        {/* Timing badges */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-white/25 hidden sm:inline">Timing</span>

          {radiantTiming && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-green-400/60 hidden sm:inline">Radiant</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  color:           TIMING_LABEL_COLORS[radiantTiming.label],
                  backgroundColor: TIMING_LABEL_COLORS[radiantTiming.label] + '22',
                  border:          `1px solid ${TIMING_LABEL_COLORS[radiantTiming.label]}44`,
                }}
              >
                {radiantTiming.label}
              </span>
            </div>
          )}

          <span className="text-white/15 text-xs">vs</span>

          {direTiming && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-red-400/60 hidden sm:inline">Dire</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  color:           TIMING_LABEL_COLORS[direTiming.label],
                  backgroundColor: TIMING_LABEL_COLORS[direTiming.label] + '22',
                  border:          `1px solid ${TIMING_LABEL_COLORS[direTiming.label]}44`,
                }}
              >
                {direTiming.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Strategy cards */}
      <div className="grid grid-cols-2 gap-px bg-white/5 border-t border-white/5">
        {(
          [
            { label: 'Radiant', urgency: radiantUrgency, accent: '#4ade80' },
            { label: 'Dire',    urgency: direUrgency,    accent: '#f87171' },
          ] as const
        ).map(({ label, urgency, accent }) => {
          const uc = URGENCY_COLORS[urgency.label]
          return (
            <div
              key={label}
              className="px-3 py-2 bg-[#0e1015]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-semibold tracking-wide" style={{ color: accent }}>
                  {label}
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ color: uc, backgroundColor: uc + '22' }}
                >
                  {urgency.label}
                </span>
              </div>
              {/* Urgency bar */}
              <div className="h-0.5 bg-white/5 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${urgency.score * 100}%`, backgroundColor: uc }}
                />
              </div>
              <p
                className="text-white/55 leading-snug overflow-hidden"
                style={{ fontSize: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              >
                {urgency.winCondition}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
