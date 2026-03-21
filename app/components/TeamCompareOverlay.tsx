'use client'

import { useMemo } from 'react'
import { ALL_DIMENSIONS, type DraftDimension, type TeamProfile } from '../../lib/types'
import { DIMENSION_LABELS, DIMENSION_COLORS } from '../../lib/displayNames'
import { teamTimingScore, TIMING_LABEL_COLORS } from '../../lib/timing'
import { analyzeMatchup } from '../../lib/matchup'
import type { MatchupInsight } from '../../lib/matchup'
import { URGENCY_COLORS } from '../../lib/matchup'

const DEV_KEY = 'dota_dev_mode'

interface TeamCompareOverlayProps {
  radiant: TeamProfile
  dire: TeamProfile
  onClose: () => void
}

export default function TeamCompareOverlay({ radiant, dire, onClose }: TeamCompareOverlayProps) {
  const sharedMax = useMemo(() => {
    const all = ALL_DIMENSIONS.flatMap(d => [
      radiant.rawAggregates[d] ?? 0,
      dire.rawAggregates[d] ?? 0,
    ])
    return Math.max(...all, 1)
  }, [radiant, dire])

  const radiantTiming = useMemo(
    () => teamTimingScore(radiant.heroes.map(h => h.timing)),
    [radiant]
  )
  const direTiming = useMemo(
    () => teamTimingScore(dire.heroes.map(h => h.timing)),
    [dire]
  )

  const matchup = useMemo(() => analyzeMatchup(radiant, dire), [radiant, dire])

  function toPercent(raw: number) {
    return Math.min((raw / sharedMax) * 100, 100)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-[#13161c] border border-white/10 rounded-xl shadow-2xl w-[680px] max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold tracking-widest uppercase text-white/60">
            Team Comparison
          </h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />
            <span className="text-green-400 font-semibold">Radiant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
            <span className="text-red-400 font-semibold">Dire</span>
          </div>
          <span className="ml-auto text-white/30 text-[10px]">
            Bars use a shared scale — both teams normalized against the same ceiling
          </span>
        </div>

        {/* Timing row */}
        <div className="flex items-center gap-3 mb-5 px-1 py-2.5 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-[10px] text-white/30 uppercase tracking-widest w-20 shrink-0 text-right">Timing</span>
          <div className="flex-1 flex items-center justify-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded"
              style={{
                color: TIMING_LABEL_COLORS[radiantTiming.label],
                backgroundColor: TIMING_LABEL_COLORS[radiantTiming.label] + '22',
                border: `1px solid ${TIMING_LABEL_COLORS[radiantTiming.label]}44`,
              }}
            >
              {radiantTiming.label}
            </span>
            <span className="text-white/20 text-xs">vs</span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded"
              style={{
                color: TIMING_LABEL_COLORS[direTiming.label],
                backgroundColor: TIMING_LABEL_COLORS[direTiming.label] + '22',
                border: `1px solid ${TIMING_LABEL_COLORS[direTiming.label]}44`,
              }}
            >
              {direTiming.label}
            </span>
          </div>
          <span className="w-20 shrink-0" />
        </div>

        {/* Dimension rows */}
        <div className="space-y-3">
          {ALL_DIMENSIONS.map(dim => {
            const rRaw = radiant.rawAggregates[dim] ?? 0
            const dRaw = dire.rawAggregates[dim] ?? 0
            const rPct = toPercent(rRaw)
            const dPct = toPercent(dRaw)
            const delta = rRaw - dRaw
            const leader: 'radiant' | 'dire' | 'even' =
              Math.abs(delta) < 0.01 ? 'even' : delta > 0 ? 'radiant' : 'dire'
            const dimColor = DIMENSION_COLORS[dim as DraftDimension] ?? '#9ca3af'

            const leaderLabel =
              leader === 'even'
                ? 'Even'
                : `${leader === 'radiant' ? 'Radiant' : 'Dire'} +${Math.abs(delta).toFixed(1)}`

            return (
              <div key={dim}>
                <div className="flex items-center mb-1">
                  <span className="text-[11px] font-medium text-white/50 w-28 shrink-0">
                    {DIMENSION_LABELS[dim as DraftDimension] ?? dim}
                  </span>
                  <span
                    className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color:
                        leader === 'radiant' ? '#4ade80' :
                        leader === 'dire'    ? '#f87171' : '#9ca3af',
                      backgroundColor:
                        leader === 'radiant' ? 'rgba(74,222,128,0.1)' :
                        leader === 'dire'    ? 'rgba(248,113,113,0.1)' : 'rgba(156,163,175,0.08)',
                    }}
                  >
                    {leaderLabel}
                  </span>
                </div>

                {/* Radiant bar */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-green-400 w-10 text-right shrink-0 tabular-nums">
                    {rRaw.toFixed(1)}
                  </span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${rPct}%`, backgroundColor: '#4ade80', opacity: 0.85 }}
                    />
                  </div>
                </div>

                {/* Dire bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-400 w-10 text-right shrink-0 tabular-nums">
                    {dRaw.toFixed(1)}
                  </span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${dPct}%`, backgroundColor: '#f87171', opacity: 0.85 }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-10 shrink-0" />
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Dim summary — numbers only in dev mode */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-green-400 font-semibold mb-1">Radiant Advantages</p>
            {ALL_DIMENSIONS.filter(d => (radiant.rawAggregates[d] ?? 0) > (dire.rawAggregates[d] ?? 0)).length === 0 ? (
              <p className="text-white/30">None</p>
            ) : (
              ALL_DIMENSIONS.filter(d => (radiant.rawAggregates[d] ?? 0) > (dire.rawAggregates[d] ?? 0))
                .sort((a, b) =>
                  ((radiant.rawAggregates[b] ?? 0) - (dire.rawAggregates[b] ?? 0)) -
                  ((radiant.rawAggregates[a] ?? 0) - (dire.rawAggregates[a] ?? 0))
                )
                .map(d => (
                  <div key={d} className="flex justify-between text-white/60">
                    <span>{DIMENSION_LABELS[d as DraftDimension]}</span>
                    <span className="text-green-400">
                      +{((radiant.rawAggregates[d] ?? 0) - (dire.rawAggregates[d] ?? 0)).toFixed(1)}
                    </span>
                  </div>
                ))
            )}
          </div>
          <div>
            <p className="text-red-400 font-semibold mb-1">Dire Advantages</p>
            {ALL_DIMENSIONS.filter(d => (dire.rawAggregates[d] ?? 0) > (radiant.rawAggregates[d] ?? 0)).length === 0 ? (
              <p className="text-white/30">None</p>
            ) : (
              ALL_DIMENSIONS.filter(d => (dire.rawAggregates[d] ?? 0) > (radiant.rawAggregates[d] ?? 0))
                .sort((a, b) =>
                  ((dire.rawAggregates[b] ?? 0) - (radiant.rawAggregates[b] ?? 0)) -
                  ((dire.rawAggregates[a] ?? 0) - (radiant.rawAggregates[a] ?? 0))
                )
                .map(d => (
                  <div key={d} className="flex justify-between text-white/60">
                    <span>{DIMENSION_LABELS[d as DraftDimension]}</span>
                    <span className="text-red-400">
                      +{((dire.rawAggregates[d] ?? 0) - (radiant.rawAggregates[d] ?? 0)).toFixed(1)}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Matchup Analysis */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Matchup Verdict
            </p>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded"
              style={{
                color:
                  matchup.overallFavored === 'radiant' ? '#4ade80' :
                  matchup.overallFavored === 'dire'    ? '#f87171' : '#94a3b8',
                backgroundColor:
                  matchup.overallFavored === 'radiant' ? 'rgba(74,222,128,0.12)' :
                  matchup.overallFavored === 'dire'    ? 'rgba(248,113,113,0.12)' : 'rgba(148,163,184,0.1)',
                border: `1px solid ${
                  matchup.overallFavored === 'radiant' ? 'rgba(74,222,128,0.3)' :
                  matchup.overallFavored === 'dire'    ? 'rgba(248,113,113,0.3)' : 'rgba(148,163,184,0.2)'
                }`,
              }}
            >
              {matchup.overallFavored === 'even' ? 'Even matchup' :
               `${matchup.overallFavored === 'radiant' ? 'Radiant' : 'Dire'} favored`}
            </span>
          </div>

          {/* Urgency cards */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(
              [
                { label: 'Radiant', urgency: matchup.radiantUrgency, accent: '#4ade80' },
                { label: 'Dire',    urgency: matchup.direUrgency,    accent: '#f87171' },
              ] as const
            ).map(({ label, urgency, accent }) => {
              const urgencyColor = URGENCY_COLORS[urgency.label]
              return (
                <div
                  key={label}
                  className="rounded-lg p-3 border"
                  style={{
                    backgroundColor: urgencyColor + '0d',
                    borderColor:     urgencyColor + '30',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold" style={{ color: accent }}>
                      {label}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color:           urgencyColor,
                        backgroundColor: urgencyColor + '22',
                      }}
                    >
                      {urgency.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${urgency.score * 100}%`, backgroundColor: urgencyColor }}
                    />
                  </div>
                  <p className="text-[10px] text-white/50 leading-snug">
                    {urgency.winCondition}
                  </p>
                  <p className="text-[9px] uppercase tracking-widest mt-1.5" style={{ color: urgencyColor + 'bb' }}>
                    Bias: {urgency.recommendationBias} picks
                  </p>
                </div>
              )
            })}
          </div>

          <InsightGroup
            label="Radiant"
            accentColor="#4ade80"
            insights={matchup.insights.filter(i => i.team === 'radiant')}
          />
          <InsightGroup
            label="Dire"
            accentColor="#f87171"
            insights={matchup.insights.filter(i => i.team === 'dire')}
          />
        </div>
      </div>
    </div>
  )
}

// ── Insight group sub-component ───────────────────────────────────────────────

function InsightGroup({
  label,
  accentColor,
  insights,
}: {
  label: string
  accentColor: string
  insights: MatchupInsight[]
}) {
  if (insights.length === 0) return null

  const advantages = insights.filter(i => i.type === 'advantage')
  const vulns      = insights.filter(i => i.type === 'vulnerability')

  const SEVERITY_DOT: Record<string, string> = {
    critical: '#ef4444',
    notable:  '#f59e0b',
    minor:    '#6b7280',
  }

  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
        {label}
      </p>
      <div className="space-y-1.5">
        {advantages.length > 0 && (
          <>
            <p className="text-[9px] uppercase tracking-wider text-white/25 mt-1">Advantages</p>
            {advantages.map((ins, idx) => (
              <InsightRow key={idx} insight={ins} severityDot={SEVERITY_DOT} isAdvantage />
            ))}
          </>
        )}
        {vulns.length > 0 && (
          <>
            <p className="text-[9px] uppercase tracking-wider text-white/25 mt-2">Vulnerabilities</p>
            {vulns.map((ins, idx) => (
              <InsightRow key={idx} insight={ins} severityDot={SEVERITY_DOT} isAdvantage={false} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function InsightRow({
  insight,
  severityDot,
  isAdvantage,
}: {
  insight: MatchupInsight
  severityDot: Record<string, string>
  isAdvantage: boolean
}) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span
        className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: severityDot[insight.severity] }}
      />
      <span className={isAdvantage ? 'text-white/70' : 'text-white/50'}>
        {insight.debugDescription}
      </span>
      <span
        className="ml-auto shrink-0 text-[9px] uppercase tracking-wide px-1 py-0.5 rounded"
        style={{
          color: severityDot[insight.severity],
          backgroundColor: severityDot[insight.severity] + '18',
        }}
      >
        {insight.severity}
      </span>
    </div>
  )
}
