import { useCallback, useRef, useState } from 'react'
import { useStore } from './store'
import type { CatId } from './types'
import { Home } from './components/Home'
import { ListView } from './components/ListView'
import { MapView } from './components/MapView'
import { AddSheet, type Draft } from './components/AddSheet'
import { Detail } from './components/Detail'
import { Us } from './components/Us'
import { YesNo } from './components/YesNo'
import { burst, ScrollView, Sheet, Splash } from './components/ui'

type Tab = 'home' | 'list' | 'map' | 'us'
type SheetState = { kind: 'add'; cat?: CatId } | { kind: 'edit'; id: string } | { kind: 'detail'; id: string } | { kind: 'yesno'; q?: string } | null

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
  const [dx, setDx] = useState(0)
  const [splash, setSplash] = useState(() => { try { return !sessionStorage.getItem('toh-splash') } catch { return true } })
  const endSplash = useCallback(() => { setSplash(false); try { sessionStorage.setItem('toh-splash', '1') } catch {} }, [])
  const timer = useRef<number>(0)
  const order: Tab[] = ['home', 'list', 'map', 'us']
  const go = (t: Tab) => {
    if (t === tab) {
      document.querySelector<HTMLElement>('.view:not([hidden])')?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setDx(order.indexOf(t) > order.indexOf(tab) ? 28 : -28)
    setTab(t)
  }
  const navCol = order.indexOf(tab)

  const undoRef = useRef<(() => void) | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  /** Petit message en bas ; avec `undo`, il propose « Annuler » pendant 7 secondes. */
  const toast = useCallback((m: string, undo?: () => void) => {
    setMsg(m)
    undoRef.current = undo ?? null
    setCanUndo(!!undo)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setMsg(''); undoRef.current = null; setCanUndo(false) }, undo ? 7000 : 2200)
  }, [])
  const undo = () => {
    undoRef.current?.()
    undoRef.current = null
    setCanUndo(false)
    clearTimeout(timer.current)
    setMsg('Annulé')
    timer.current = window.setTimeout(() => setMsg(''), 1200)
  }
  // brouillon d'ajout : si on referme la feuille en cours de saisie, rien n'est perdu
  const draft = useRef<Draft | null>(null)
  const sheetRef = useRef<SheetState>(null)
  sheetRef.current = sheet
  const close = useCallback(() => {
    if (sheetRef.current?.kind === 'add' && draft.current) toast('Brouillon gardé pour plus tard')
    setSheet(null)
  }, [toast])
  const open = (id: string) => setSheet({ kind: 'detail', id })
  const check = (id: string, el: HTMLElement) => {
    burst(el)
    store.patch(id, { done: true, doneAt: Date.now() })
    toast("C'est fait !", () => { store.patch(id, { done: false, doneAt: undefined }); setSheet(null) })
    setTimeout(() => setSheet({ kind: 'detail', id }), 380)
  }

  return (
    <div className="app">
      <main>
        <ScrollView hidden={tab !== 'home'} title="Threeofheart" dx={dx}>
          <Home store={store} onOpen={open} onCheck={check} onYesNo={() => setSheet({ kind: 'yesno' })}
            onCat={(c) => { setFilter(c); go('list') }} />
        </ScrollView>
        <ScrollView hidden={tab !== 'list'} title="Notre liste" dx={dx}>
          <ListView store={store} filter={filter} setFilter={setFilter} onOpen={open} onCheck={check}
            onDraw={(id) => { setSheet({ kind: 'detail', id }); toast('Tiré au sort !') }} />
        </ScrollView>
        <section className="view mapview" data-on={tab === 'map'}>
          <MapView store={store} active={tab === 'map'} onOpen={open} />
        </section>
        <ScrollView hidden={tab !== 'us'} title="Nous deux" dx={dx}>
          <Us store={store} toast={toast} />
        </ScrollView>
      </main>

      <div className="dock">
        <nav className="tabs" aria-label="Navigation">
          <span className="tab-blob" style={{ ['--col' as string]: navCol }} aria-hidden="true" />
          {TABS.map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} go={() => go(t.id)} />)}
        </nav>
        <button className="fab" aria-label="Ajouter une idée"
          onClick={() => setSheet({ kind: 'add', cat: draft.current ? undefined : tab === 'list' && filter !== 'all' ? filter : undefined })}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      <Sheet open={!!sheet} onClose={close}>
        {sheet?.kind === 'add' && (
          <AddSheet store={store} initialCat={sheet.cat} draft={draft.current} onDraft={(d) => { draft.current = d }}
            onDone={(it) => { draft.current = null; setSheet(null); toast(it.lat != null ? 'Ajouté et épinglé sur la carte' : 'Ajouté à notre liste') }} />
        )}
        {sheet?.kind === 'edit' && (
          <AddSheet key={'edit-' + sheet.id} store={store} edit={store.state.items.find((i) => i.id === sheet.id)}
            onDone={(it) => { setSheet({ kind: 'detail', id: it.id }); toast('Modifié') }} />
        )}
        {sheet?.kind === 'detail' && <Detail key={sheet.id} store={store} id={sheet.id} onClose={close} toast={toast}
          onYesNo={(q) => setSheet({ kind: 'yesno', q })} onEdit={() => setSheet({ kind: 'edit', id: sheet.id })} />}
        {sheet?.kind === 'yesno' && <YesNo question={sheet.q} />}
      </Sheet>
      <div className={'toast' + (msg ? ' on' : '') + (canUndo ? ' undo' : '')} role="status">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 21C5 16 2 12.5 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5c0 4-3 7.5-10 12.5z" /></svg>
        {msg}
        {canUndo && <button className="toast-undo" onClick={undo}>Annuler</button>}
      </div>
      {splash && <Splash onEnd={endSplash} />}
      <div className="rotate" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
        <p>Remets ton téléphone droit, Three of Heart se vit en portrait.</p>
      </div>
    </div>
  )
}

function TabBtn({ t, on, go }: { t: (typeof TABS)[number]; on: boolean; go: () => void }) {
  return (
    <button className="tab" aria-current={on ? 'page' : undefined} onClick={go}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.icon }} />
      <span className="tab-label">{t.label}</span>
    </button>
  )
}
