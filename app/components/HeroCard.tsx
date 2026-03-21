'use client'

import { useEffect, useRef, useState } from 'react'
import { toDisplayName } from '../../lib/displayNames'

export type CardSize = 'sm' | 'md' | 'lg'

export const CARD_DIMS: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 88,  h: 50 },
  md: { w: 104, h: 59 },
  lg: { w: 120, h: 68 },
}

interface HeroCardProps {
  heroName:        string
  radiantFull:     boolean
  direFull:        boolean
  cardSize?:       CardSize
  recommendedFor?: 'radiant' | 'dire' | 'both'
  isTopPick?:      boolean
  isBanned?:       boolean
  onAdd:           (team: 'radiant' | 'dire') => void
  onProfile:       () => void
  onBan:           () => void
  onUnban:         () => void
}

const RING: Record<'radiant' | 'dire' | 'both', React.CSSProperties> = {
  radiant: { boxShadow: '0 0 0 2px #4ade80' },
  dire:    { boxShadow: '0 0 0 2px #f87171' },
  both:    { boxShadow: '0 0 0 2px #4ade80, 0 0 0 4px #f87171' },
}
const TOP_RING: Record<'radiant' | 'dire' | 'both', React.CSSProperties> = {
  radiant: { boxShadow: '0 0 0 2px #4ade80, 0 0 12px 3px rgba(74,222,128,0.55)' },
  dire:    { boxShadow: '0 0 0 2px #f87171, 0 0 12px 3px rgba(248,113,113,0.55)' },
  both:    { boxShadow: '0 0 0 2px #4ade80, 0 0 0 4px #f87171, 0 0 14px 3px rgba(74,222,128,0.45)' },
}

export default function HeroCard({
  heroName,
  radiantFull,
  direFull,
  cardSize     = 'md',
  recommendedFor,
  isTopPick    = false,
  isBanned     = false,
  onAdd,
  onProfile,
  onBan,
  onUnban,
}: HeroCardProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const { w, h } = CARD_DIMS[cardSize]
  const imgUrl      = `/hero_images/${heroName}.png`
  const fallbackUrl = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroName}.png`
  const displayName = toDisplayName(heroName)
  const bothFull    = radiantFull && direFull

  // Dismiss tap overlay when touching outside the card
  useEffect(() => {
    if (!showOverlay) return
    function onOutsideTouch(e: TouchEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowOverlay(false)
      }
    }
    document.addEventListener('touchstart', onOutsideTouch, { passive: true })
    return () => document.removeEventListener('touchstart', onOutsideTouch)
  }, [showOverlay])

  // Ring style (banned cards get a dim red ring instead)
  const ringStyle = isBanned
    ? { boxShadow: '0 0 0 1.5px rgba(239,68,68,0.5)' }
    : recommendedFor && isTopPick ? TOP_RING[recommendedFor]
    : recommendedFor              ? RING[recommendedFor]
    : undefined

  const dotColor =
    recommendedFor === 'radiant' ? '#4ade80' :
    recommendedFor === 'dire'    ? '#f87171' : '#4ade80'

  // Banned cards are slightly smaller than normal; top-picks scale up
  const scaleClass = isBanned ? 'scale-90 opacity-60' : isTopPick && recommendedFor ? 'scale-105' : ''

  return (
    <div
      ref={cardRef}
      className={`relative rounded overflow-hidden cursor-pointer select-none transition-transform duration-150 ${scaleClass}`}
      style={{ width: w, height: h, ...ringStyle }}
      // ── Desktop: hover to show overlay, click outside overlay = profile ──
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      onClick={onProfile}
      // ── Mobile: tap toggles overlay ───────────────────────────────────────
      onTouchEnd={e => {
        e.preventDefault()
        setShowOverlay(v => !v)
      }}
    >
      {/* Hero image */}
      <img
        src={imgUrl}
        alt={displayName}
        onError={e => { (e.currentTarget as HTMLImageElement).src = fallbackUrl }}
        className={`w-full h-full object-cover pointer-events-none${
          isBanned  ? ' grayscale brightness-50' :
          bothFull  ? ' opacity-30' : ''
        }`}
        draggable={false}
      />

      {/* Banned: red tint + ✕ */}
      {isBanned && !showOverlay && (
        <>
          <div className="absolute inset-0 bg-red-950/40 pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-red-500 font-black leading-none"
              style={{ fontSize: '28px', textShadow: '0 0 8px rgba(239,68,68,0.8)' }}
            >✕</span>
          </div>
        </>
      )}

      {/* Top-pick gradient wash */}
      {!isBanned && isTopPick && recommendedFor && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${dotColor}18 0%, transparent 60%)` }}
        />
      )}

      {/* Recommendation dot / star */}
      {!isBanned && recommendedFor && !showOverlay && (
        <div className="absolute top-1 right-1 flex gap-0.5 items-center pointer-events-none">
          {isTopPick ? (
            <span className="text-[11px] leading-none font-bold"
              style={{ color: dotColor, textShadow: `0 0 6px ${dotColor}` }}>★</span>
          ) : (
            <>
              {(recommendedFor === 'radiant' || recommendedFor === 'both') &&
                <span className="w-2 h-2 rounded-full bg-green-400" />}
              {(recommendedFor === 'dire' || recommendedFor === 'both') &&
                <span className="w-2 h-2 rounded-full bg-red-400" />}
            </>
          )}
        </div>
      )}

      {/* Name strip */}
      {!showOverlay && (
        <div
          className="absolute bottom-0 left-0 right-0 px-1 py-0.5 pointer-events-none"
          style={{
            backgroundColor:
              isBanned                    ? 'rgba(239,68,68,0.15)' :
              isTopPick && recommendedFor ? `${dotColor}28`        : 'rgba(0,0,0,0.6)',
          }}
        >
          <span
            className="font-medium truncate block text-center leading-tight"
            style={{
              fontSize: cardSize === 'sm' ? '9px' : '10px',
              color:    isBanned                    ? 'rgba(252,165,165,0.7)' :
                        isTopPick && recommendedFor ? dotColor                : 'white',
            }}
          >
            {displayName}
          </span>
        </div>
      )}

      {/* ── 4-button overlay (hover on desktop, tap on mobile) ── */}
      {showOverlay && (
        <div
          className="absolute inset-0 flex flex-col bg-black/90"
          onClick={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          {/* Top — Profile */}
          <button
            className="flex-1 flex items-center justify-center text-[9px] font-bold tracking-wide text-blue-300 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors border-b border-white/10"
            onClick={e => { e.stopPropagation(); setShowOverlay(false); onProfile() }}
            onTouchEnd={e => { e.stopPropagation(); setShowOverlay(false); onProfile() }}
          >
            ▲ Profile
          </button>

          {/* Middle — Radiant | Dire  (or Unban when banned) */}
          <div className="flex flex-[2]">
            {isBanned ? (
              <button
                className="flex-1 flex items-center justify-center text-[9px] font-bold tracking-wide text-orange-300 hover:bg-orange-500/20 active:bg-orange-500/30 transition-colors"
                onClick={e => { e.stopPropagation(); setShowOverlay(false); onUnban() }}
                onTouchEnd={e => { e.stopPropagation(); setShowOverlay(false); onUnban() }}
              >
                ↩ Unban
              </button>
            ) : (
              <>
                <button
                  className={`flex-1 flex items-center justify-center text-[9px] font-bold tracking-wide border-r border-white/10 transition-colors ${
                    radiantFull ? 'text-white/20 cursor-not-allowed' : 'text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  }`}
                  disabled={radiantFull}
                  onClick={e => { e.stopPropagation(); if (!radiantFull) { setShowOverlay(false); onAdd('radiant') } }}
                  onTouchEnd={e => { e.stopPropagation(); if (!radiantFull) { setShowOverlay(false); onAdd('radiant') } }}
                >
                  ◀ Radiant
                </button>
                <button
                  className={`flex-1 flex items-center justify-center text-[9px] font-bold tracking-wide transition-colors ${
                    direFull ? 'text-white/20 cursor-not-allowed' : 'text-red-400 hover:bg-red-500/20 active:bg-red-500/30'
                  }`}
                  disabled={direFull}
                  onClick={e => { e.stopPropagation(); if (!direFull) { setShowOverlay(false); onAdd('dire') } }}
                  onTouchEnd={e => { e.stopPropagation(); if (!direFull) { setShowOverlay(false); onAdd('dire') } }}
                >
                  Dire ▶
                </button>
              </>
            )}
          </div>

          {/* Bottom — Ban (or +Radiant/+Dire when banned) */}
          {isBanned ? (
            <div className="flex flex-1 border-t border-white/10">
              <button
                className={`flex-1 flex items-center justify-center text-[9px] font-bold tracking-wide border-r border-white/10 transition-colors ${
                  radiantFull ? 'text-white/20 cursor-not-allowed' : 'text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                }`}
                disabled={radiantFull}
                onClick={e => { e.stopPropagation(); if (!radiantFull) { setShowOverlay(false); onUnban(); onAdd('radiant') } }}
                onTouchEnd={e => { e.stopPropagation(); if (!radiantFull) { setShowOverlay(false); onUnban(); onAdd('radiant') } }}
              >
                + Radiant
              </button>
              <button
                className={`flex-1 flex items-center justify-center text-[9px] font-bold tracking-wide transition-colors ${
                  direFull ? 'text-white/20 cursor-not-allowed' : 'text-red-400 hover:bg-red-500/20 active:bg-red-500/30'
                }`}
                disabled={direFull}
                onClick={e => { e.stopPropagation(); if (!direFull) { setShowOverlay(false); onUnban(); onAdd('dire') } }}
                onTouchEnd={e => { e.stopPropagation(); if (!direFull) { setShowOverlay(false); onUnban(); onAdd('dire') } }}
              >
                + Dire
              </button>
            </div>
          ) : (
            <button
              className="flex-1 flex items-center justify-center text-[9px] font-bold tracking-wide text-orange-400 hover:bg-orange-500/20 active:bg-orange-500/30 transition-colors border-t border-white/10"
              onClick={e => { e.stopPropagation(); setShowOverlay(false); onBan() }}
              onTouchEnd={e => { e.stopPropagation(); setShowOverlay(false); onBan() }}
            >
              ▼ Ban
            </button>
          )}
        </div>
      )}
    </div>
  )
}
