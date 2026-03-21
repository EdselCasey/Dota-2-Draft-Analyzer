'use client'

type Zone = 'radiant' | 'dire' | 'profile' | 'ban' | null

interface DropZoneOverlayProps {
  activeZone:  Zone
  radiantFull: boolean
  direFull:    boolean
}

const ZONES = [
  {
    id:        'radiant' as const,
    label:     'Radiant',
    hint:      'drag left',
    color:     '#4ade80',
    bg:        'rgba(74,222,128,0.15)',
    activeBg:  'rgba(74,222,128,0.35)',
    // fixed position classes — NO translate so scale works cleanly
    posClass:  'left-4 top-1/2',
    style:     { transform: 'translateY(-50%)' },
  },
  {
    id:        'dire' as const,
    label:     'Dire',
    hint:      'drag right',
    color:     '#f87171',
    bg:        'rgba(248,113,113,0.15)',
    activeBg:  'rgba(248,113,113,0.35)',
    posClass:  'right-4 top-1/2',
    style:     { transform: 'translateY(-50%)' },
  },
  {
    id:        'profile' as const,
    label:     'Profile',
    hint:      'drag up',
    color:     '#60a5fa',
    bg:        'rgba(96,165,250,0.15)',
    activeBg:  'rgba(96,165,250,0.35)',
    posClass:  'top-4 left-1/2',
    style:     { transform: 'translateX(-50%)' },
  },
  {
    id:        'ban' as const,
    label:     'Ban',
    hint:      'drag down',
    color:     '#fb923c',
    bg:        'rgba(251,146,60,0.15)',
    activeBg:  'rgba(251,146,60,0.35)',
    posClass:  'bottom-4 left-1/2',
    style:     { transform: 'translateX(-50%)' },
  },
]

export default function DropZoneOverlay({ activeZone, radiantFull, direFull }: DropZoneOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* dim backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {ZONES.map(z => {
        const isActive   = activeZone === z.id
        const isDisabled =
          (z.id === 'radiant' && radiantFull) ||
          (z.id === 'dire'    && direFull)

        return (
          <div
            key={z.id}
            className={`absolute ${z.posClass}`}
            style={z.style}
          >
            <div
              className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border transition-all duration-150"
              style={{
                backgroundColor: isActive ? z.activeBg : z.bg,
                borderColor:     isActive ? z.color     : z.color + '55',
                boxShadow:       isActive ? `0 0 24px 6px ${z.color}44` : 'none',
                opacity:         isDisabled ? 0.25 : 1,
                minWidth:        '80px',
                transform:       isActive ? 'scale(1.25)' : 'scale(1)',
                transition:      'transform 120ms ease, background-color 120ms ease, box-shadow 120ms ease',
              }}
            >
              <span className="text-lg leading-none" style={{ color: z.color }}>
                {z.id === 'radiant' ? '◀' : z.id === 'dire' ? '▶' : z.id === 'profile' ? '▲' : '▼'}
              </span>
              <span className="text-xs font-bold tracking-wide" style={{ color: z.color }}>
                {z.label}
              </span>
              <span className="text-[9px] tracking-wider" style={{ color: z.color + 'aa' }}>
                {z.hint}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
