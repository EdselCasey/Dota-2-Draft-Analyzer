'use client'

import { useEffect, useRef, useState } from 'react'
import { toDisplayName } from '../../lib/displayNames'

interface TeamSlotProps {
  heroName:  string | null
  team:      'radiant' | 'dire'
  onRemove:  () => void
  onProfile: () => void
}

export default function TeamSlot({ heroName, team, onRemove, onProfile }: TeamSlotProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const imgUrl      = heroName ? `/hero_images/${heroName}.png`  : null
  const imgFallback = heroName
    ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroName}.png`
    : null

  // Dismiss when touching outside
  useEffect(() => {
    if (!showOverlay) return
    function onOutside(e: TouchEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowOverlay(false)
      }
    }
    document.addEventListener('touchstart', onOutside, { passive: true })
    return () => document.removeEventListener('touchstart', onOutside)
  }, [showOverlay])

  if (!heroName) {
    return (
      <div className="w-full h-[52px] rounded border border-dashed border-white/20 bg-white/5 flex items-center justify-center">
        <span className="text-white/20 text-xs">empty</span>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className="group relative w-full h-[52px] rounded overflow-hidden border border-white/10 cursor-pointer"
      // Desktop: click = profile, hover = overlay with Profile/Remove
      onClick={onProfile}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      // Mobile: tap toggles overlay
      onTouchEnd={e => { e.preventDefault(); setShowOverlay(v => !v) }}
      title={`${toDisplayName(heroName)} — tap for options`}
    >
      <img
        src={imgUrl!}
        alt={toDisplayName(heroName)}
        onError={e => { (e.currentTarget as HTMLImageElement).src = imgFallback! }}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Name strip */}
      {!showOverlay && (
        <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold text-white bg-black/60 py-0.5 truncate px-1 pointer-events-none">
          {toDisplayName(heroName)}
        </span>
      )}

      {/* Overlay — hover desktop, tap mobile */}
      {showOverlay && (
        <div
          className="absolute inset-0 flex bg-black/80"
          onClick={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          <button
            className="flex-1 flex items-center justify-center text-white/80 hover:text-white text-[10px] font-semibold hover:bg-white/10 active:bg-white/20 transition-colors"
            onClick={e => { e.stopPropagation(); setShowOverlay(false); onProfile() }}
            onTouchEnd={e => { e.stopPropagation(); setShowOverlay(false); onProfile() }}
          >
            Profile
          </button>
          <div className="w-px bg-white/10" />
          <button
            className="flex-1 flex items-center justify-center text-red-400 hover:text-red-300 text-[10px] font-semibold hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
            onClick={e => { e.stopPropagation(); setShowOverlay(false); onRemove() }}
            onTouchEnd={e => { e.stopPropagation(); setShowOverlay(false); onRemove() }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
