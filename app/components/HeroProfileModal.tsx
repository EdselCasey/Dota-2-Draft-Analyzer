'use client'

import { useEffect } from 'react'
import type { HeroProfile } from '../../lib/types'
import { ALL_DIMENSIONS } from '../../lib/types'
import { toDisplayName, DIMENSION_LABELS, DIMENSION_COLORS } from '../../lib/displayNames'
import { TIMING_LABEL_COLORS } from '../../lib/timing'

interface HeroProfileModalProps {
  profile: HeroProfile
  onClose: () => void
}

const TAG_COLORS: Record<string, string> = {
  stun: '#a855f7', root: '#7c3aed', silence: '#6d28d9', hex: '#8b5cf6',
  slow: '#c084fc', disarm: '#9333ea', knockback: '#a78bfa', taunt: '#7e22ce',
  forced_movement: '#c4b5fd',leash: '#5249ca',banish: '#b34792',
  low_burst: '#fca5a5', medium_burst: '#ef4444', high_burst: '#b91c1c',
  low_sustained: '#fdba74', medium_sustained: '#f97316', high_sustained: '#c2410c',
  small_aoe: '#fde68a', medium_aoe: '#fb923c', large_aoe: '#9a3412',
  short_range: '#a5f3fc', medium_range: '#22d3ee', long_range: '#0891b2',
  damage_reduction: '#3b82f6', armor_gain: '#2563eb', save: '#1d4ed8',
  heal: '#22c55e', shield: '#16a34a', regen: '#4ade80', lifesteal: '#86efac',
  invulnerability: '#059669',hp_growth: '#4ade80',
  blink: '#06b6d4', dash: '#0891b2', movement_speed_boost: '#67e8f9',
  escape: '#0e7490', teleport: '#0284c7',
  summon_units: '#eab308', illusion: '#ca8a04', siege: '#a16207',
  building_damage: '#92400e', push_structures: '#d97706', zone_control: '#f59e0b',
  stealth: '#6366f1', aerial: '#818cf8',unobstructed: '#818cf8',
  attack_speed_boost: '#fb923c', armor_reduction: '#e64709',
  attack_damage_boost: '#ea580c', attack_modifier: '#c2410c',magic_amp: '#f97316',
  dispel: '#14b8a6', debuff_immunity: '#0f766e', vision: '#5eead4',
  mana_regen: '#6366f1', global: '#4f46e5',antiheal: '#9fc00a',gold_gain: '#6376f2',
  channelled: '#3e74c0',
  passive: '#fbbf24', short_cooldown: '#f59e0b', medium_cooldown: '#d97706', long_cooldown: '#bd6717',
}

export default function HeroProfileModal({ profile, onClose }: HeroProfileModalProps) {
  const displayName = toDisplayName(profile.name)
  const imgFull = `/hero_portraits/${profile.name}.png`
  const imgPortrait = `/hero_images/${profile.name}.png`
  const imgCdnFallback = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${profile.name}_full.png`

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const maxScore = Math.max(...ALL_DIMENSIONS.map(d => profile.dimensionScores[d] ?? 0), 1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#141720] border border-white/10 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero banner */}
        <div className="relative">
          <img
            src={imgFull}
            alt={displayName}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement
              if (el.src.includes('/hero_portraits/')) { el.src = imgPortrait }
              else if (el.src.includes('/hero_images/')) { el.src = imgCdnFallback }
            }}
            className="w-full h-52 object-cover object-top rounded-t-xl"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141720] to-transparent rounded-t-xl" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white drop-shadow">{displayName}</h2>
              <span
                className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{
                  color: TIMING_LABEL_COLORS[profile.timing.label],
                  backgroundColor: TIMING_LABEL_COLORS[profile.timing.label] + '22',
                  border: `1px solid ${TIMING_LABEL_COLORS[profile.timing.label]}44`,
                }}
              >
                {profile.timing.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Dimension scores */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
              Draft Dimensions
            </h3>
            <div className="space-y-1.5">
              {ALL_DIMENSIONS.map(dim => {
                const score = profile.dimensionScores[dim] ?? 0
                const pct = (score / maxScore) * 100
                return (
                  <div key={dim} className="flex items-center gap-2">
                    <span className="text-[11px] text-white/50 w-[90px] shrink-0 text-right">
                      {DIMENSION_LABELS[dim]}
                    </span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: DIMENSION_COLORS[dim],
                          opacity: pct === 0 ? 0 : 1,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-white/60 w-7 text-right tabular-nums">
                      {score.toFixed(1)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Tagged abilities */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
              Ability Tags
            </h3>
            {profile.taggedAbilities.length === 0 ? (
              <p className="text-white/30 text-xs">No tags detected</p>
            ) : (
              <div className="space-y-2">
                {profile.taggedAbilities.map(ability => (
                  <div key={ability.name} className="flex flex-wrap items-start gap-1.5">
                    <span className="text-[11px] text-white/40 shrink-0 w-[140px] truncate pt-0.5">
                      {ability.name.replace(`${profile.name}_`, '').replace(/_/g, ' ')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ability.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: (TAG_COLORS[tag] ?? '#374151') + '33',
                            color: TAG_COLORS[tag] ?? '#9ca3af',
                            border: `1px solid ${(TAG_COLORS[tag] ?? '#374151')}55`,
                          }}
                        >
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
