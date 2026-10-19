import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cat, Heart } from '../cats'
import { avg, type Store } from '../store'
import type { AppState } from '../types'
import { CountUp } from './ui'
import { getDesign, setDesign, type Design } from '../design'
import { disablePush, enablePush, pushState, type PushState } from '../sync'

type Toast = (m: string, undo?: () => void) => void

const ICONS = {
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 9.5z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  out: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
  in: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
  bin: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/>',
}
const Ic = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
)
const Chevron = () => (
  <svg className="row-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
)

/** Une rubrique façon Réglages : un titre, puis des lignes dans une carte. */
function Group({ title, foot, children }: { title: string; foot?: ReactNode; children: ReactNode }) {
  return (
    <section className="group">
      <h2 className="group-title">{title}</h2>
      <div className="group-card">{children}</div>
      {foot && <p className="group-foot">{foot}</p>}
    </section>
  )
}

function Row({ icon, tone, label, sub, end, onClick, danger }: {
  icon: string; tone: string; label: ReactNode; sub?: ReactNode; end?: ReactNode; onClick?: () => void; danger?: boolean
}) {
  const inner = (
    <>
      <span className="row-ic" style={{ background: `var(--bg-${tone})`, color: `var(--ink-${tone})` }}><Ic d={icon} /></span>
      <span className="row-txt"><b className={danger ? 'danger' : undefined}>{label}</b>{sub && <small>{sub}</small>}</span>
      {end}
    </>
  )
  return onClick ? <button className="row" onClick={onClick}>{inner}</button> : <div className="row">{inner}</div>
}

function Switch({ on, busy, onChange, label }: { on: boolean; busy?: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className={'switch' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} disabled={busy} onClick={() => onChange(!on)}><i /></button>
}

export function Us({ store, toast }: { store: Store; toast: Toast }) {
  const { state, clearExamples, replaceAll } = store
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
    <div className="page us">
      <header className="us-head">
        <div className="duo">
          <span className="av big a">{state.names.a[0]}</span>
          <Heart size={26} className="beat" />
          <span className="av big b">{state.names.b[0]}</span>
        </div>
        <h1 className="us-names">{state.names.a} & {state.names.b}</h1>
      </header>

      <div className="stats">
        <div className="stat" style={{ background: 'var(--c-pink)' }}><b><CountUp value={state.items.length - done.length} /></b><span>à faire</span></div>
        <div className="stat" style={{ background: 'var(--c-blue)' }}><b><CountUp value={done.length} /></b><span>faits</span></div>
        <div className="stat" style={{ background: 'var(--c-mint)' }}><b>{rated.length ? <CountUp value={rated.reduce((a, b) => a + b, 0) / rated.length} decimals={1} /> : '–'}</b><span>cœurs en moy.</span></div>
      </div>
      {best && avg(best) > 0 && (
        <div className="best" style={{ background: cat(best.cat).bg, color: cat(best.cat).ink }}>
          <span className="tag">Notre coup de cœur</span>
          <b>{best.title}</b>
          <span className="best-score"><Heart size={15} /> {avg(best).toFixed(1)} / 5</span>
        </div>
      )}

      <SyncGroup store={store} />
      {store.session && <NotifGroup store={store} toast={toast} />}

      <Group title="Apparence">
        <div className="design-pick">
          <button aria-pressed={design === 'v1'} onClick={() => pick('v1')}>
            <span className="mini" style={{ background: '#0038BD' }}><i style={{ background: '#C8F135' }} /><i style={{ background: '#EF8E01' }} /><i style={{ background: '#EEEEEE' }} /></span>
            <span className="pick-name">Mode Toni</span>
            <span className="pick-dot" aria-hidden="true" />
          </button>
          <button aria-pressed={design === 'v2'} onClick={() => pick('v2')}>
            <span className="mini" style={{ background: '#FFF6F1' }}><i style={{ background: '#DE3566' }} /><i style={{ background: '#FCCC60' }} /><i style={{ background: '#72BA2C' }} /></span>
            <span className="pick-name">Mode Ju</span>
            <span className="pick-dot" aria-hidden="true" />
          </button>
        </div>
      </Group>

      <Group title="Sauvegarde" foot="Un fichier avec toutes vos idées, à garder dans Fichiers ou à vous envoyer.">
        <Row icon={ICONS.out} tone="activite" label="Exporter nos idées" onClick={exportData} end={<Chevron />} />
        <Row icon={ICONS.in} tone="serie" label="Importer une sauvegarde" onClick={() => file.current?.click()} end={<Chevron />} />
        {hasExamples && (
          <Row icon={ICONS.bin} tone="resto" danger label={sure ? 'Touche encore pour confirmer' : 'Effacer les exemples'}
            onClick={() => { if (sure) { clearExamples(); toast('Exemples effacés'); setSure(false) } else setSure(true) }} />
        )}
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importData(e.target.files?.[0])} />
      </Group>
    </div>
  )
}

const STATUS = { off: 'Connecté', syncing: 'Synchronisation…', ok: 'Synchronisé', offline: 'Hors ligne' }

function SyncGroup({ store }: { store: Store }) {
  const { session, sync, signIn, signOut } = store
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (session) {
    return (
      <Group title="Synchro" foot={sync === 'offline' ? 'Vos changements partiront dès que le réseau revient.' : undefined}>
        <Row icon={ICONS.cloud} tone="film"
          label={<span className="with-dot"><span className={'sync-dot ' + sync} aria-hidden="true" />{STATUS[sync]}</span>}
          sub={session.user.email}
          end={<button className="row-action" onClick={signOut}>Déconnexion</button>} />
      </Group>
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
    <Group title="Synchro" foot="Tant que tu n'es pas connecté, vos idées restent sur ce téléphone.">
      <form className="login" onSubmit={go}>
        <Row icon={ICONS.key} tone="film" label="Se connecter" sub="Pour partager la même liste sur vos deux téléphones" />
        <input type="email" autoComplete="username" inputMode="email" placeholder="Ton e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" autoComplete="current-password" placeholder="Mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} required />
        {err && <p className="hint">{err}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </Group>
  )
}

function NotifGroup({ store, toast }: { store: Store; toast: Toast }) {
  const [st, setSt] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushState().then(setSt).catch(() => setSt('unsupported')) }, [])
  if (!st) return null
  const other = store.state.names[store.state.me === 'a' ? 'b' : 'a']
  const toggle = async (v: boolean) => {
    setBusy(true)
    try {
      if (v) { await enablePush(store.state.me); setSt('on'); toast('Notifications activées') } else { await disablePush(); setSt('off') }
    } catch (e) {
      if ((e as Error).message === 'denied') setSt('denied')
      else toast("Impossible pour l'instant, réessaie plus tard")
    }
    setBusy(false)
  }
  const foot = st === 'install' ? "Ajoute d'abord l'app à l'écran d'accueil : Partager, puis « Sur l'écran d'accueil »."
    : st === 'denied' ? 'Refusées sur ce téléphone. Pour les remettre : Réglages, Notifications, Three of Heart.'
    : st === 'unsupported' ? 'Ce navigateur ne gère pas les notifications.'
    : `Quand ${other} ajoute, coche ou note une idée.`
  const usable = st === 'on' || st === 'off'
  return (
    <Group title="Notifications" foot={foot}>
      <Row icon={ICONS.bell} tone="event" label="Me prévenir"
        end={<Switch on={st === 'on'} busy={busy || !usable} onChange={toggle} label="Notifications" />} />
    </Group>
  )
}
