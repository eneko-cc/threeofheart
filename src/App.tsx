import { useCallback, useRef, useState } from 'react'
import { useStore } from './store'
import type { CatId } from './types'
import { Home } from './components/Home'
import { ListView } from './components/ListView'
import { MapView } from './components/MapView'
import { AddSheet } from './components/AddSheet'
import { Detail } from './components/Detail'
import { Us } from './components/Us'
import { burst, Sheet } from './components/ui'

type Tab = 'home' | 'list' | 'map' | 'us'
type SheetState = { kind: 'add'; cat?: CatId } | { kind: 'detail'; id: string } | null

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>' },
  { id: 'list', label: 'Liste', icon: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>' },
  { id: 'map', label: 'Carte', icon: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>' },
  { id: 'us', label: 'Nous', icon: '<path d="M12 20C6 15.5 3 12.5 3 9a4.5 4.5 0 0 1 9-1.5A4.5 4.5 0 0 1 21 9c0 3.5-3 6.5-9 11z"/>' },
]

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [filter, setFilter] = useState<CatId | 'all'>('all')
  const [sheet, setSheet] = useState<SheetState>(null)
  const [msg, setMsg] = useState('')
  const timer = useRef<number>(0)

  const toast = useCallback((m: string) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(''), 1900)
  }, [])
  const close = useCallback(() => setSheet(null), [])
  const open = (id: string) => setSheet({ kind: 'detail', id })
  const check = (id: string, el: HTMLElement) => {
    burst(el)
    store.patch(id, { done: true, doneAt: Date.now() })
    setTimeout(() => setSheet({ kind: 'detail', id }), 450)
  }
  const random = () => {
    const pool = store.state.items.filter((i) => !i.done)
    if (!pool.length) return toast('Plus rien à tirer au sort !')
    setSheet({ kind: 'detail', id: pool[Math.floor(Math.random() * pool.length)].id })
  }

  return (
    <div className="app">
      <main>
        <section className="view" hidden={tab !== 'home'}>
          <Home store={store} onOpen={open} onCheck={check} onRandom={random}
            onCat={(c) => { setFilter(c); setTab('list') }} />
        </section>
        <section className="view" hidden={tab !== 'list'}>
          <ListView store={store} filter={filter} setFilter={setFilter} onOpen={open} onCheck={check} />
        </section>
        <section className="view mapview" data-on={tab === 'map'}>
          <MapView store={store} active={tab === 'map'} onOpen={open} />
        </section>
        <section className="view" hidden={tab !== 'us'}>
          <Us store={store} toast={toast} />
        </section>
      </main>

      <nav className="tabs" aria-label="Navigation">
        {TABS.slice(0, 2).map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} go={() => setTab(t.id)} />)}
        <button className="fab" aria-label="Ajouter une idée"
          onClick={() => setSheet({ kind: 'add', cat: tab === 'list' && filter !== 'all' ? filter : undefined })}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        {TABS.slice(2).map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} go={() => setTab(t.id)} />)}
      </nav>

      <Sheet open={!!sheet} onClose={close}>
        {sheet?.kind === 'add' && (
          <AddSheet store={store} initialCat={sheet.cat}
            onDone={(it) => { close(); toast(it.lat != null ? 'Ajouté et épinglé sur la carte' : 'Ajouté à notre liste') }} />
        )}
        {sheet?.kind === 'detail' && <Detail key={sheet.id} store={store} id={sheet.id} onClose={close} toast={toast} />}
      </Sheet>
      <div className={'toast' + (msg ? ' on' : '')} role="status">{msg}</div>
    </div>
  )
}

function TabBtn({ t, on, go }: { t: (typeof TABS)[number]; on: boolean; go: () => void }) {
  return (
    <button className="tab" aria-current={on ? 'page' : undefined} onClick={go} aria-label={t.label}>
      <span className="tab-ic">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: t.icon }} />
      </span>
    </button>
  )
}
