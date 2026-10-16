import { useRef, useState } from 'react'
import { cat, Heart } from '../cats'
import { avg, type Store } from '../store'
import type { AppState } from '../types'
import { CountUp } from './ui'
import { getDesign, setDesign, type Design } from '../design'

export function Us({ store, toast }: { store: Store; toast: (m: string, undo?: () => void) => void }) {
  const { state, setNames, clearExamples, replaceAll } = store
  const file = useRef<HTMLInputElement>(null)

  /** Sauvegarde de toutes nos idées dans un fichier, à garder dans Fichiers ou à s'envoyer. */
  const exportData = async () => {
    const day = new Date().toISOString().slice(0, 10)
    const f = new File([JSON.stringify(state, null, 1)], `threeofheart-${day}.json`, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: 'Sauvegarde Threeofheart' }); return }
    } catch (e) { if ((e as Error).name === 'AbortError') return }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const importData = async (f?: File) => {
    if (!f) return
    try {
      const next = JSON.parse(await f.text()) as AppState
      if (!Array.isArray(next.items)) throw new Error('format')
      const before = state
      replaceAll(next)
      toast(`${next.items.length} idées restaurées`, () => replaceAll(before))
    } catch {
      toast("Ce fichier n'est pas une sauvegarde Threeofheart")
    }
    if (file.current) file.current.value = ''
  }
  const [sure, setSure] = useState(false)
  const [design, setD] = useState<Design>(getDesign)
  const pick = (d: Design) => { setD(d); setDesign(d) }
  const done = state.items.filter((i) => i.done)
  const rated = done.map(avg).filter(Boolean)
  const best = [...done].sort((x, y) => avg(y) - avg(x))[0]
  const hasExamples = state.items.some((i) => i.example)

  return (
    <div className="page">
      <div className="duo">
        <span className="av big a">{state.names.a[0]}</span>
        <Heart size={30} className="beat" />
        <span className="av big b">{state.names.b[0]}</span>
      </div>
      <div className="stats">
        <div className="stat" style={{ background: 'var(--c-pink)' }}><b><CountUp value={state.items.length - done.length} /></b><span>à faire</span></div>
        <div className="stat" style={{ background: 'var(--c-blue)' }}><b><CountUp value={done.length} /></b><span>faits</span></div>
        <div className="stat" style={{ background: 'var(--c-mint)' }}><b>{rated.length ? <CountUp value={rated.reduce((a, b) => a + b, 0) / rated.length} decimals={1} /> : '–'}</b><span>cœurs en moy.</span></div>
      </div>
      {best && avg(best) > 0 && (
        <div className="best" style={{ background: cat(best.cat).bg, color: cat(best.cat).ink }}>
          <span className="tag">Notre coup de cœur</span>
          <b>{best.title}</b>
          <span>{avg(best).toFixed(1)} / 5</span>
        </div>
      )}

      <div className="section-head"><h2>Synchro</h2></div>
      <SyncBox store={store} />

      <div className="section-head"><h2>Style de l'app</h2></div>
      <div className="design-pick">
        <button aria-pressed={design === 'v1'} onClick={() => pick('v1')}>
          <span className="swatches"><i style={{ background: '#F8C9D6' }} /><i style={{ background: '#C3DDF2' }} /><i style={{ background: '#1F4D3A' }} /></span>
          Version 1
        </button>
        <button aria-pressed={design === 'v2'} onClick={() => pick('v2')}>
          <span className="swatches"><i style={{ background: '#DE3566' }} /><i style={{ background: '#FCCC60' }} /><i style={{ background: '#72BA2C' }} /><i style={{ background: '#FF9B3D' }} /></span>
          Palette de Ju
        </button>
      </div>

      <div className="section-head"><h2>Prénoms</h2></div>
      <div className="names">
        <input id="name-a" aria-label="Premier prénom" maxLength={14} value={state.names.a} onChange={(e) => setNames({ ...state.names, a: e.target.value || ' ' })} />
        <input id="name-b" aria-label="Second prénom" maxLength={14} value={state.names.b} onChange={(e) => setNames({ ...state.names, b: e.target.value || ' ' })} />
      </div>

      {hasExamples && (
        <button className="ghost danger" onClick={() => { if (sure) { clearExamples(); toast('Exemples effacés'); setSure(false) } else setSure(true) }}>
          {sure ? 'Appuie encore pour confirmer' : 'Effacer les exemples'}
        </button>
      )}
      <div className="section-head"><h2>Sauvegarde</h2></div>
      <div className="names">
        <button className="secondary" onClick={exportData}>Exporter</button>
        <button className="secondary" onClick={() => file.current?.click()}>Importer</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importData(e.target.files?.[0])} />
      </div>
      {!store.session && <p className="note">Tant que tu n'es pas connecté, vos idées restent sur ce téléphone.</p>}
    </div>
  )
}

const STATUS = { off: '', syncing: 'Synchronisation…', ok: 'Synchronisé', offline: 'Hors ligne, ça partira dès que possible' }

function SyncBox({ store }: { store: Store }) {
  const { session, sync, signIn, signOut } = store
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (session) {
    return (
      <div className="sync on">
        <span className={'sync-dot ' + sync} aria-hidden="true" />
        <span className="sync-txt"><b>{STATUS[sync] || 'Connecté'}</b><small>{session.user.email}</small></span>
        <button className="ghost" onClick={signOut}>Déconnexion</button>
      </div>
    )
  }
  const go = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await signIn(email, pw) } catch (x) {
      setErr(/invalid/i.test(String((x as Error).message)) ? 'E-mail ou mot de passe incorrect' : 'Connexion impossible, vérifie le réseau')
    }
    setBusy(false)
  }
  return (
    <form className="sync" onSubmit={go}>
      <p className="sync-lead">Connecte-toi pour partager la même liste sur vos deux téléphones.</p>
      <input type="email" autoComplete="username" inputMode="email" placeholder="Ton e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" autoComplete="current-password" placeholder="Mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} required />
      {err && <p className="hint">{err}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  )
}
