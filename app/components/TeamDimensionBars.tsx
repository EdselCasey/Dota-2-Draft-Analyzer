'use client'

import { ALL_DIMENSIONS } from '../../lib/types'
import type { TeamProfile } from '../../lib/types'
import { DIMENSION_LABELS, DIMENSION_COLORS } from '../../lib/displayNames'

interface TeamDimensionBarsProps {
  team: TeamProfile | null
  accentColor: string
}

export default function TeamDimensionBars({ team, accentColor }: TeamDimensionBarsProps) {
  if (!team) {
    return (
      <div className="px-3 py-4 text-center text-white/20 text-xs">
        Add heroes to see analysis
      </div>
    )
  }

  return (
    <div className="px-3 py-3 border-t border-white/10 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
        Team Analysis
      </p>
      {ALL_DIMENSIONS.map(dim => {
        const score    = team.aggregateScores[dim] ?? 0
        const pct      = Math.min((score / 10) * 100, 100)
        const isWeak   = team.weaknesses.includes(dim)
        const isStrong = team.strengths.includes(dim)

        return (
          <div key={dim} className="flex items-center gap-2">
            <span
              className="text-[10px] w-[72px] shrink-0 text-right leading-tight"
              style={{ color: isWeak ? '#f87171' : isStrong ? '#86efac' : '#9ca3af' }}
            >
              {DIMENSION_LABELS[dim]}
            </span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width:           `${pct}%`,
                  backgroundColor: DIMENSION_COLORS[dim],
                  opacity:         pct === 0 ? 0 : 1,
                }}
              />
            </div>
            <span
              className="text-[10px] w-6 text-right tabular-nums shrink-0"
              style={{ color: accentColor }}
            >
              {score.toFixed(1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
