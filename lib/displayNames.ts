import type { DraftDimension } from './types'

export const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  abyssal_underlord: 'Underlord',
  doom_bringer: 'Doom',
  necrolyte: 'Necrophos',
  nevermore: 'Shadow Fiend',
  obsidian_destroyer: 'Outworld Destroyer',
  rattletrap: 'Clockwerk',
  wisp: 'Io',
  magnataur: 'Magnus',
  skeleton_king: 'Wraith King',
  zuus: 'Zeus',
  furion: "Nature's Prophet",
  windrunner: "Windranger",
  queenofpain: "Queen of Pain",
  vengefulspirit: "Vengeful Spirit",
  treant: "Treant Protector",
  centaur: "Centaur Warrunner",
  shredder: "Timbersaw"
}

export function toDisplayName(heroName: string): string {
  return (
    DISPLAY_NAME_OVERRIDES[heroName] ??
    heroName
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

export const DIMENSION_LABELS: Record<DraftDimension, string> = {
  teamfight:        'Teamfight',
  control:          'Control',
  burst_damage:     'Burst',
  sustained_damage: 'Sustained',
  sustain:          'Sustain',
  defense:          'Defense',
  mobility:         'Mobility',
  push:             'Push',
  pickoff:          'Pick-off',
  vision_control:   'Vision',
  map_presence:     'Map Presence',
  resource_support: 'Resources',
  defensive_utility:'Def. Utility',
  spell_uptime:     'Spell Uptime',
}

export const DIMENSION_COLORS: Record<DraftDimension, string> = {
  teamfight:        '#f97316',
  control:          '#a855f7',
  burst_damage:     '#ef4444',
  sustained_damage: '#f87171',
  sustain:          '#22c55e',
  defense:          '#3b82f6',
  mobility:         '#06b6d4',
  push:             '#eab308',
  pickoff:          '#ec4899',
  vision_control:   '#14b8a6',
  map_presence:     '#8b5cf6',
  resource_support: '#6366f1',
  defensive_utility:'#0ea5e9',
  spell_uptime:     '#fbbf24',
}
