// Synchro entre vos deux téléphones, via Supabase.
// La clé « publishable » est faite pour être publique : l'accès est verrouillé côté Supabase
// (seuls les deux comptes créés à la main peuvent se connecter, inscriptions fermées).
import { createClient, type Session } from '@supabase/supabase-js'
import type { Item } from './types'

const URL = 'https://idyirkploavsttlvgfax.supabase.co'
const KEY = 'sb_publishable_a1RkuHn0YXoS8S4mmrCgRQ_dsySpxez'

export const sb = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'toh-auth' },
})

export type { Session }

// Qui est qui, d'après l'e-mail de connexion. On garde seulement l'empreinte des e-mails (le code est public).
const WHO: Record<string, 'a' | 'b'> = {
  '161bd3b1c1c1088c7c15974eb3b89843d51c2364bb579619d282c9817f59d633': 'a', // Toni
  '11b74278aca3746f028b5e64c76e81848db2005abdc2b95615dbb1e923af6b41': 'b', // Ju
}
export async function whoIs(email: string): Promise<'a' | 'b' | undefined> {
  try {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()))
    return WHO[[...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('')]
  } catch { return undefined }
}

export interface Row { id: string; data: Item; deleted: boolean; updated_at?: string }
export interface SettingRow { key: string; value: unknown }

/** Changements locaux pas encore envoyés : id → l'idée, ou null si supprimée. Survit à la fermeture de l'app. */
const PENDING = 'toh-pending'
export function readPending(): Record<string, Item | null> {
  try { return JSON.parse(localStorage.getItem(PENDING) ?? '{}') } catch { return {} }
}
export function writePending(p: Record<string, Item | null>) {
  try { localStorage.setItem(PENDING, JSON.stringify(p)) } catch {}
}

let actor: 'a' | 'b' = 'a'
let hasActor = true
export const setActor = (who: 'a' | 'b') => { actor = who }

export async function pushItems(p: Record<string, Item | null>) {
  const now = new Date().toISOString()
  const rows = Object.entries(p).map(([id, it]) => ({
    id, data: it ?? {}, deleted: !it, updated_at: now,
    // la colonne « actor » n'existe qu'une fois le script des notifications passé dans Supabase
    ...(hasActor ? { actor } : {}),
  }))
  if (!rows.length) return
  let { error } = await sb.from('items').upsert(rows)
  if (error && hasActor && /actor/.test(error.message)) {
    hasActor = false
    ;({ error } = await sb.from('items').upsert(rows.map(({ actor: _, ...r }) => r)))
  }
  if (error) throw error
}

export async function pushSetting(key: string, value: unknown) {
  const { error } = await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function fetchAll() {
  const [items, settings] = await Promise.all([
    sb.from('items').select('id,data,deleted'),
    sb.from('settings').select('key,value'),
  ])
  if (items.error) throw items.error
  if (settings.error) throw settings.error
  return { items: (items.data ?? []) as Row[], settings: (settings.data ?? []) as SettingRow[] }
}

// ---- notifications : chaque téléphone s'inscrit une fois, Supabase prévient l'autre à chaque ajout, coche ou note
export const VAPID_PUBLIC = 'BGy467YuEFeBOKR12T_QejOrDL9WlPxtqDqxX-noZg3IRosg29kosa2Gv0unXVA_RA7GTcI22w_xVdRgVBMKVKo'

const b64 = (s: string) => {
  const p = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0))
}

export type PushState = 'unsupported' | 'install' | 'off' | 'on' | 'denied'

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // sur iPhone, les notifications n'existent que pour l'app ajoutée à l'écran d'accueil
    return /iPhone|iPad/.test(navigator.userAgent) ? 'install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) && Notification.permission === 'granted' ? 'on' : 'off'
}

export async function enablePush(who: 'a' | 'b') {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('denied')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) }))
  const json = sub.toJSON()
  const { error } = await sb.from('push_subs').upsert({ endpoint: json.endpoint, who, sub: json, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await sb.from('push_subs').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
