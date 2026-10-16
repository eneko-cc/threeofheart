import { useCallback, useEffect, useState } from 'react'
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

export function useStore() {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {}
  }, [state])

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

  return { state, upsert, patch, remove, clearExamples, setNames, setMe }
}

export type Store = ReturnType<typeof useStore>
