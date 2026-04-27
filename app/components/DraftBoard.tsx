'use client'

import { useState, useMemo } from 'react'
import type { HeroProfile } from '../../lib/types'
import { buildTeamProfile } from '../../lib/scorer'
import { toDisplayName } from '../../lib/displayNames'
import { analyzeMatchup } from '../../lib/matchup'
import { computeRecommendations } from '../../lib/recommend'
import { teamTimingScore } from '../../lib/timing'
import HeroCard, { type CardSize } from './HeroCard'
import {
  HERO_ATTR, ATTR_LABEL, ATTR_ICON, ATTR_COLOR,
  type PrimaryAttr,
} from '../../lib/heroAttributes'
import TeamSlot from './TeamSlot'
import TeamDimensionBars from './TeamDimensionBars'
import HeroProfileModal from './HeroProfileModal'
import TeamCompareOverlay from './TeamCompareOverlay'
import DraftVerdictPanel from './DraftVerdictPanel'

type Team = 'radiant' | 'dire'

interface DraftBoardProps {
  heroProfiles: HeroProfile[]
}

const SIZE_LABELS: CardSize[] = ['sm', 'md', 'lg']

export default function DraftBoard({ heroProfiles }: DraftBoardProps) {
  const [radiant, setRadiant] = useState<(string | null)[]>(Array(5).fill(null))
  const [dire, setDire]       = useState<(string | null)[]>(Array(5).fill(null))
  const [search, setSearch]   = useState('')
  const [selectedHero, setSelectedHero]   = useState<string | null>(null)
  const [showCompare, setShowCompare]     = useState(false)
  const [bannedHeroes, setBannedHeroes]   = useState<string[]>([])
  const [mobileTeamTab, setMobileTeamTab] = useState<Team | null>(null)
  const [cardSize, setCardSize]           = useState<CardSize>('sm')
  const [groupByAttr, setGroupByAttr]     = useState(true)

  // ── Stable helpers ─────────────────────────────────────────────────────────

  function addToTeam(hero: string, team: Team) {
    const setter = team === 'radiant' ? setRadiant : setDire
    setter(prev => {
      const idx = prev.findIndex(s => s === null)
      if (idx === -1) return prev
      const next = [...prev]; next[idx] = hero; return next
    })
  }

  function removeFromTeam(hero: string, team: Team) {
    const setter = team === 'radiant' ? setRadiant : setDire
    setter(prev => prev.map(h => (h === hero ? null : h)))
  }

  function banHero(hero: string) {
    setBannedHeroes(prev => prev.includes(hero) ? prev : [...prev, hero])
  }

  function unbanHero(hero: string) {
    setBannedHeroes(prev => prev.filter(h => h !== hero))
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const heroProfileMap = useMemo(() => {
    const map = new Map<string, HeroProfile>()
    heroProfiles.forEach(p => map.set(p.name, p))
    return map
  }, [heroProfiles])

  const bannedSet   = useMemo(() => new Set(bannedHeroes), [bannedHeroes])
  const assignedSet = useMemo(
    () => new Set([...radiant, ...dire].filter(Boolean) as string[]),
    [radiant, dire]
  )

  const pool = useMemo(() => {
    const q = search.toLowerCase()
    return heroProfiles
      .filter(p => !assignedSet.has(p.name) && toDisplayName(p.name).toLowerCase().includes(q))
      .sort((a, b) => toDisplayName(a.name).localeCompare(toDisplayName(b.name)))
  }, [heroProfiles, assignedSet, search])

  const recPool = useMemo(
    () => pool.filter(p => !bannedSet.has(p.name)),
    [pool, bannedSet]
  )

  const radiantCount = radiant.filter(Boolean).length
  const direCount    = dire.filter(Boolean).length

  const radiantTeam = useMemo(() => {
    const profiles = radiant.filter(Boolean).map(n => heroProfileMap.get(n!)).filter(Boolean) as HeroProfile[]
    return profiles.length > 0 ? buildTeamProfile(profiles) : null
  }, [radiant, heroProfileMap])

  const direTeam = useMemo(() => {
    const profiles = dire.filter(Boolean).map(n => heroProfileMap.get(n!)).filter(Boolean) as HeroProfile[]
    return profiles.length > 0 ? buildTeamProfile(profiles) : null
  }, [dire, heroProfileMap])

  // ── Single matchup computation shared by verdict, recommendations, top picks ──

  const matchup = useMemo(() => {
    if (!radiantTeam && !direTeam) return null
    const r = radiantTeam ?? buildTeamProfile([])
    const d = direTeam    ?? buildTeamProfile([])
    return analyzeMatchup(r, d)
  }, [radiantTeam, direTeam])

  const radiantTiming = useMemo(
    () => radiantTeam ? teamTimingScore(radiantTeam.heroes.map(h => h.timing)) : null,
    [radiantTeam]
  )
  const direTiming = useMemo(
    () => direTeam ? teamTimingScore(direTeam.heroes.map(h => h.timing)) : null,
    [direTeam]
  )

  const recommendedMap = useMemo<Map<string, 'radiant' | 'dire' | 'both'>>(() => {
    if (!matchup) return new Map()
    const r = radiantTeam ?? buildTeamProfile([])
    const d = direTeam    ?? buildTeamProfile([])
    const { radiant: rRecs, dire: dRecs } = computeRecommendations(r, d, recPool, matchup)
    const map = new Map<string, 'radiant' | 'dire' | 'both'>()
    if (radiantCount < 5) for (const rec of rRecs) map.set(rec.hero.name, 'radiant')
    if (direCount    < 5) for (const rec of dRecs) {
      const ex = map.get(rec.hero.name)
      map.set(rec.hero.name, ex === 'radiant' ? 'both' : 'dire')
    }
    return map
  }, [matchup, radiantTeam, direTeam, recPool, radiantCount, direCount])

  const topPickSet = useMemo<Set<string>>(() => {
    if (!matchup) return new Set()
    const r = radiantTeam ?? buildTeamProfile([])
    const d = direTeam    ?? buildTeamProfile([])
    const { radiant: rRecs, dire: dRecs } = computeRecommendations(r, d, recPool, matchup, 1)
    const set = new Set<string>()
    if (rRecs[0] && radiantCount < 5) set.add(rRecs[0].hero.name)
    if (dRecs[0] && direCount    < 5) set.add(dRecs[0].hero.name)
    return set
  }, [matchup, radiantTeam, direTeam, recPool, radiantCount, direCount])

  const selectedProfile = selectedHero ? heroProfileMap.get(selectedHero) ?? null : null

  // ── Team panel (shared desktop/mobile) ────────────────────────────────────

  function renderTeamPanel(team: Team) {
    const heroes    = team === 'radiant' ? radiant : dire
    const count     = team === 'radiant' ? radiantCount : direCount
    const teamObj   = team === 'radiant' ? radiantTeam  : direTeam
    const accent    = team === 'radiant' ? '#4ade80' : '#f87171'
    const label     = team === 'radiant' ? 'Radiant'  : 'Dire'
    const dotClass  = team === 'radiant' ? 'bg-green-500'   : 'bg-red-500'
    const textClass = team === 'radiant' ? 'text-green-400' : 'text-red-400'

    return (
      <>
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 sticky top-0 bg-[#0e1015] z-10">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          <span className={`font-semibold ${textClass} text-sm`}>{label}</span>
          <span className="ml-auto text-white/40 text-xs">{count}/5</span>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {heroes.map((hero, i) => (
            <TeamSlot
              key={i}
              heroName={hero}
              team={team}
              onRemove={() => hero && removeFromTeam(hero, team)}
              onProfile={() => hero && setSelectedHero(hero)}
            />
          ))}
        </div>
        <TeamDimensionBars team={teamObj} accentColor={accent} />
      </>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0e1015] text-white flex flex-col">

      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 shrink-0 flex items-center gap-3">
        <h1 className="text-base lg:text-xl font-bold tracking-wide text-white/90 truncate">
          Dota 2 Draft Analyzer
        </h1>
        {radiantTeam && direTeam ? (
          <button
            onClick={() => setShowCompare(true)}
            title="Compare both teams — see dimension scores side by side and which team has the advantage"
            className="ml-auto px-3 py-1.5 text-xs font-semibold rounded border border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            ⚖ Compare
          </button>
        ) : (
          <span
            title="Add at least one hero to each team to unlock the Compare panel"
            className="ml-auto px-3 py-1.5 text-xs font-semibold rounded border border-white/10 bg-white/[0.02] text-white/25 cursor-not-allowed shrink-0 select-none"
          >
            ⚖ Compare
          </span>
        )}
      </header>

      {/* Mobile team tabs */}
      <div className="lg:hidden flex border-b border-white/10 shrink-0">
        {(['radiant', 'dire'] as Team[]).map(team => {
          const count  = team === 'radiant' ? radiantCount : direCount
          const color  = team === 'radiant'
            ? 'text-green-400 border-green-400'
            : 'text-red-400 border-red-400'
          const active = mobileTeamTab === team
          return (
            <button
              key={team}
              onClick={() => setMobileTeamTab(active ? null : team)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
                active ? color : 'border-transparent text-white/40'
              }`}
            >
              {team === 'radiant' ? 'Radiant' : 'Dire'} {count}/5
            </button>
          )
        })}
      </div>

      {/* Mobile expanded team panel */}
      {mobileTeamTab && (
        <div className="lg:hidden border-b border-white/10 overflow-y-auto max-h-[40vh] shrink-0">
          {renderTeamPanel(mobileTeamTab)}
        </div>
      )}

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Radiant sidebar — desktop */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-white/10 flex-col overflow-y-auto">
          {renderTeamPanel('radiant')}
        </aside>

        {/* Hero Pool */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Draft Verdict Panel — always visible, updates in real time */}
          <DraftVerdictPanel
            matchup={matchup}
            radiantTiming={radiantTiming}
            direTiming={direTiming}
            radiantCount={radiantCount}
            direCount={direCount}
          />

          {/* Hero pool toolbar */}
          <div className="px-4 py-2 mt-2 border-b border-white/10 flex items-center justify-center sm:justify-start gap-2 shrink-0 flex-wrap">
            <span className="text-white/50 text-sm">Hero Pool</span>
            <span className="text-white/30 text-xs">({pool.length})</span>

            {/* Card size selector */}
            <div className="flex items-center gap-0.5 ml-1" title="Resize hero cards">
              {SIZE_LABELS.map(s => (
                <button
                  key={s}
                  onClick={() => setCardSize(s)}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                    cardSize === s ? 'bg-white/20 text-white' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Attribute group toggle */}
            <button
              onClick={() => setGroupByAttr(v => !v)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                groupByAttr
                  ? 'border-purple-400/60 bg-purple-500/20 text-purple-300'
                  : 'border-white/15 bg-white/5 text-white/40 hover:text-white/70'
              }`}
              title={groupByAttr ? 'Switch to alphabetical list' : 'Group heroes by primary attribute (Strength / Agility / Intelligence / Universal)'}
            >
              {groupByAttr ? '✦ Grouped' : '✦ Group'}
            </button>

            {/* Legend tooltip */}
            <div className="relative group/legend">
              <button
                className="text-[11px] text-white/30 hover:text-white/70 transition-colors leading-none px-1"
                tabIndex={0}
                aria-label="Hero card legend"
              >
                ⓘ
              </button>
              <div className="fixed inset-0 z-50 flex items-center justify-center sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-1 sm:block w-64 sm:w-64
                opacity-0 pointer-events-none 
                group-hover/legend:opacity-100 group-hover/legend:pointer-events-auto 
                group-focus-within/legend:opacity-100 group-focus-within/legend:pointer-events-auto 
                transition-opacity duration-150">
                <div className="rounded-lg border border-white/15 bg-[#1a1d24] shadow-xl p-3 text-[11px] leading-relaxed text-white/80 w-64">
                <p className="font-bold text-white/60 uppercase tracking-wide text-[10px] mb-2">Hero Card Legend</p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-green-400 shrink-0" />
                    <span>Green outline — recommended pick for <span className="text-green-400">Radiant</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-red-400 shrink-0" />
                    <span>Red outline — recommended pick for <span className="text-red-400">Dire</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-green-400 border-r-red-400 shrink-0" style={{ boxShadow: '0 0 0 1.5px #4ade80, 0 0 0 3px #f87171' }} />
                    <span>Double outline — recommended for <span className="text-green-400">both</span> teams</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-bold text-[13px] leading-none">★</span>
                    <span>Star + glow — <strong className="text-white">top pick</strong> (strongest single recommendation)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    </span>
                    <span>Dot(s) — standard recommendation pick</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-black text-base leading-none">✕</span>
                    <span>Greyed out with ✕ — hero is <span className="text-orange-400">banned</span> (excluded from recommendations)</span>
                  </div>
                </div>
                <p className="mt-2 text-white/35 text-[10px]">Hover a card to add to Radiant / Dire, view profile, or ban.</p>
                </div>
              </div>
            </div>

            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ml-auto w-32 lg:w-40 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 lg:p-4">
            {groupByAttr ? (
              /* ── 2×2 attribute grid ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                {(
                  [
                    ['strength',     'intelligence'],
                    ['agility',      'universal'   ],
                  ] as PrimaryAttr[][]
                ).map((row) =>
                  row.map((attr) => {
                    const heroes = pool.filter(p => (HERO_ATTR[p.name] ?? 'universal') === attr)
                    const color  = ATTR_COLOR[attr]
                    const gap    = cardSize === 'sm' ? 6 : 8
                    return (
                      <div key={attr}>
                        {/* Section header */}
                        <div className="flex items-center gap-1.5 mb-2 justify-center sm:justify-start">
                          <img
                            src={ATTR_ICON[attr]}
                            alt={ATTR_LABEL[attr]}
                            className="w-4 h-4 object-contain"
                          />
                          <span
                            className="text-xs font-bold tracking-wide uppercase"
                            style={{ color }}
                          >
                            {ATTR_LABEL[attr]}
                          </span>
                          <span className="text-[10px] text-white/25 ml-0.5">({heroes.length})</span>
                        </div>
                        {/* Heroes */}
                        <div className="flex flex-wrap justify-center sm:justify-start" style={{ gap }}>
                          {heroes.map(p => (
                            <HeroCard
                              key={p.name}
                              heroName={p.name}
                              radiantFull={radiantCount >= 5}
                              direFull={direCount >= 5}
                              cardSize={cardSize}
                              recommendedFor={recommendedMap.get(p.name)}
                              isTopPick={topPickSet.has(p.name)}
                              isBanned={bannedSet.has(p.name)}
                              onAdd={team => addToTeam(p.name, team)}
                              onProfile={() => setSelectedHero(p.name)}
                              onBan={() => banHero(p.name)}
                              onUnban={() => unbanHero(p.name)}
                            />
                          ))}
                          {heroes.length === 0 && (
                            <span className="text-white/20 text-xs italic">none available</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              /* ── Flat alphabetical list ── */
              <div className="flex flex-wrap justify-center sm:justify-start" style={{ gap: cardSize === 'sm' ? 6 : 8 }}>
                {pool.map(p => (
                  <HeroCard
                    key={p.name}
                    heroName={p.name}
                    radiantFull={radiantCount >= 5}
                    direFull={direCount >= 5}
                    cardSize={cardSize}
                    recommendedFor={recommendedMap.get(p.name)}
                    isTopPick={topPickSet.has(p.name)}
                    isBanned={bannedSet.has(p.name)}
                    onAdd={team => addToTeam(p.name, team)}
                    onProfile={() => setSelectedHero(p.name)}
                    onBan={() => banHero(p.name)}
                    onUnban={() => unbanHero(p.name)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Dire sidebar — desktop */}
        <aside className="hidden lg:flex w-56 shrink-0 border-l border-white/10 flex-col overflow-y-auto">
          {renderTeamPanel('dire')}
        </aside>
      </div>

      {selectedProfile && (
        <HeroProfileModal profile={selectedProfile} onClose={() => setSelectedHero(null)} />
      )}

      {showCompare && radiantTeam && direTeam && (
        <TeamCompareOverlay radiant={radiantTeam} dire={direTeam} onClose={() => setShowCompare(false)} />
      )}
    </div>
  )
}
