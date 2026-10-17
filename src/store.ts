import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAll, pushItems, pushSetting, readPending, sb, whoIs, writePending, type Row, type Session } from './sync'
import type { AppState, Item } from './types'
import importData from './data/import.json'

const KEY = 'toh-v1'
// Vos lieux Mapstr et vos listes « Trucs à regarder » et « Trucs à faire », importés le 16 octobre 2026.
const IMPORTED = importData as Item[]
const DATA_VERSION = 2

const initial = (): AppState => ({ items: IMPORTED, names: { a: 'Toni', b: 'Ju' }, me: 'a', v: DATA_VERSION })

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      const saved = { ...initial(), ...parsed } as AppState
      if ((parsed.v ?? 1) < DATA_VERSION) {
        // On retire les exemples du départ et on ajoute l'import, sans toucher à ce que vous avez ajouté.
        const mine = saved.items.filter((i) => !i.example)
        const ids = new Set(mine.map((i) => i.id))
        saved.items = [...mine, ...IMPORTED.filter((i) => !ids.has(i.id))]
        saved.v = DATA_VERSION
      }
      return saved
    }
  } catch {}
  return initial()
}

export const avg = (i: Item) => {
  const v = [i.ra, i.rb].filter((x): x is number => !!x)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'offline'

const snap = (i: Item) => JSON.stringify(i)

export function useStore() {
  const [state, setState] = useState<AppState>(load)
  const [session, setSession] = useState<Session | null>(null)
  const [sync, setSync] = useState<SyncStatus>('off')
  // ce que l'on sait déjà être identique sur Supabase, pour n'envoyer que ce qui change
  const known = useRef<Map<string, string> | null>(null)
  const knownNames = useRef<string>('')
  const flushing = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  // ---- connexion
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    // demande à iOS de ne jamais effacer le cache local de l'app
    navigator.storage?.persist?.().catch(() => {})
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const flush = useCallback(async () => {
    if (flushing.current) return
    const p = readPending()
    if (!Object.keys(p).length) { setSync('ok'); return }
    flushing.current = true
    setSync('syncing')
    try {
      await pushItems(p)
      const now = readPending()
      for (const id of Object.keys(p)) if (JSON.stringify(now[id]) === JSON.stringify(p[id])) delete now[id]
      writePending(now)
      setSync('ok')
    } catch {
      setSync('offline')
    } finally {
      flushing.current = false
    }
  }, [])

  // ---- premier échange après connexion, puis temps réel
  useEffect(() => {
    if (!session) { known.current = null; setSync('off'); return }
    let alive = true
    const email = session.user.email ?? ''
    const applyRow = (r: Row) => {
      if (r.id in readPending()) return // une modif faite ici n'est pas encore partie : elle gagne
      const m = known.current ?? new Map()
      if (r.deleted) m.delete(r.id); else m.set(r.id, snap(r.data))
      known.current = m
      setState((s) => {
        const rest = s.items.filter((i) => i.id !== r.id)
        return { ...s, items: r.deleted ? rest : s.items.some((i) => i.id === r.id) ? s.items.map((i) => (i.id === r.id ? r.data : i)) : [r.data, ...rest] }
      })
    }
    const applySetting = (k: string, v: unknown) => {
      if (k === 'names' && v && typeof v === 'object') { knownNames.current = JSON.stringify(v); setState((s) => ({ ...s, names: v as AppState['names'] })) }
    }
    ;(async () => {
      setSync('syncing')
      try {
        const [remote, who] = await Promise.all([fetchAll(), whoIs(email)])
        if (!alive) return
        const pending = readPending()
        const m = new Map<string, string>()
        const gone = new Set<string>()
        const remoteItems = new Map<string, Item>()
        for (const r of remote.items) {
          if (r.deleted) gone.add(r.id)
          else { remoteItems.set(r.id, r.data); m.set(r.id, snap(r.data)) }
        }
        setState((s) => {
          const local = new Map(s.items.map((i) => [i.id, i]))
          const out: Item[] = []
          for (const [id, it] of remoteItems) out.push(id in pending && pending[id] ? pending[id]! : id in pending ? null! : it)
          // ce qui n'existe que sur ce téléphone part sur Supabase
          for (const [id, it] of local) {
            if (remoteItems.has(id) || gone.has(id) || id in pending) continue
            out.push(it)
            pending[id] = it
          }
          writePending(pending)
          const items = out.filter(Boolean).sort((x, y) => y.createdAt - x.createdAt)
          // qui est qui : la première personne connectée sur un rond le garde
          const people = (remote.settings.find((r) => r.key === 'people')?.value ?? {}) as { a?: string; b?: string }
          let me = s.me
          if (who) {
            me = who
            if (people[who] !== email) pushSetting('people', { ...people, [who]: email }).catch(() => {})
          } else if (people.a === email) me = 'a'
          else if (people.b === email) me = 'b'
          else {
            me = !people.a && !(s.me === 'b' && !people.b) ? 'a' : !people.b ? 'b' : s.me
            pushSetting('people', { ...people, [me]: email }).catch(() => {})
          }
          const names = remote.settings.find((r) => r.key === 'names')?.value as AppState['names'] | undefined
          if (names) knownNames.current = JSON.stringify(names)
          return { ...s, items, me, names: names ?? s.names }
        })
        known.current = m
        await flush()
      } catch {
        if (alive) setSync('offline')
      }
    })()

    const ch = sb.channel('couple')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (e) => { if (e.new && 'id' in e.new) applyRow(e.new as Row) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (e) => { const r = e.new as { key?: string; value?: unknown }; if (r?.key) applySetting(r.key, r.value) })
      .subscribe()
    const again = () => { if (document.visibilityState === 'visible') flush() }
    window.addEventListener('online', again)
    document.addEventListener('visibilitychange', again)
    return () => {
      alive = false
      sb.removeChannel(ch)
      window.removeEventListener('online', again)
      document.removeEventListener('visibilitychange', again)
    }
  }, [session, flush])

  // ---- chaque changement local part sur Supabase
  useEffect(() => {
    const m = known.current
    if (!session || !m) return
    const p = readPending()
    let changed = false
    const seen = new Set<string>()
    for (const it of state.items) {
      seen.add(it.id)
      const v = snap(it)
      if (m.get(it.id) !== v) { m.set(it.id, v); p[it.id] = it; changed = true }
    }
    for (const id of [...m.keys()]) if (!seen.has(id)) { m.delete(id); p[id] = null; changed = true }
    if (changed) { writePending(p); flush() }
    const n = JSON.stringify(state.names)
    if (knownNames.current && n !== knownNames.current) { knownNames.current = n; pushSetting('names', state.names).catch(() => {}) }
    else if (!knownNames.current) { knownNames.current = n; pushSetting('names', state.names).catch(() => {}) }
  }, [state, session, flush])

  const upsert = useCallback((item: Item) => {
    setState((s) => {
      const exists = s.items.some((i) => i.id === item.id)
      return { ...s, items: exists ? s.items.map((i) => (i.id === item.id ? item : i)) : [item, ...s.items] }
    })
  }, [])
  const patch = useCallback((id: string, p: Partial<Item>) => {
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }))
  }, [])
  const remove = useCallback((id: string) => setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) })), [])
  const clearExamples = useCallback(() => setState((s) => ({ ...s, items: s.items.filter((i) => !i.example) })), [])
  const setNames = useCallback((names: AppState['names']) => setState((s) => ({ ...s, names })), [])
  const setMe = useCallback((me: AppState['me']) => setState((s) => ({ ...s, me })), [])
  const replaceAll = useCallback((next: AppState) => setState({ ...initial(), ...next, v: DATA_VERSION }), [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }, [])
  const signOut = useCallback(async () => { await sb.auth.signOut() }, [])

  return { state, upsert, patch, remove, clearExamples, setNames, setMe, replaceAll, session, sync, signIn, signOut }
}

export type Store = ReturnType<typeof useStore>
