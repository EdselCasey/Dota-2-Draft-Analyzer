import { loadAllHeroes } from '../lib/heroLoader'
import type { HeroProfile } from '../lib/types'
import DraftBoard from './components/DraftBoard'

export default function Page() {
  const allHeroes = loadAllHeroes()

  const heroProfiles: HeroProfile[] = Array.from(allHeroes.values())
    .filter(p => p.name !== 'target_dummy')
    .sort((a, b) => a.name.localeCompare(b.name))

  return <DraftBoard heroProfiles={heroProfiles} />
}
