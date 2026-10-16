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

export async function pushItems(p: Record<string, Item | null>) {
  const now = new Date().toISOString()
  const rows = Object.entries(p).map(([id, it]) => (it ? { id, data: it, deleted: false, updated_at: now } : { id, data: {}, deleted: true, updated_at: now }))
  if (!rows.length) return
  const { error } = await sb.from('items').upsert(rows)
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
