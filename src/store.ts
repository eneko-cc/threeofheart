import { useCallback, useEffect, useState } from 'react'
import type { AppState, Item } from './types'

const KEY = 'toh-v1'
const day = 86_400_000
const now = Date.now()

/** Exemples à Paris, marqués `example` pour pouvoir les effacer d'un coup */
const SEED: Item[] = [
  { id: 'ex1', title: 'Ramen rue Sainte-Anne', cat: 'resto', where: '1er', lat: 48.8665, lng: 2.3355, by: 'a', createdAt: now - day,
    note: 'Faire la queue tôt, ça vaut le coup.' },
  { id: 'ex2', title: 'Atelier poterie à deux', cat: 'activite', where: 'Belleville', lat: 48.8722, lng: 2.3767, by: 'b', createdAt: now - 2 * day,
    note: 'Réserver un samedi matin.' },
  { id: 'ex3', title: 'Brunch au bord du canal', cat: 'resto', where: 'Canal Saint-Martin', lat: 48.871, lng: 2.3655, by: 'b', createdAt: now - 3 * day },
  { id: 'ex4', title: 'Expo au Palais de Tokyo', cat: 'event', where: '16e', lat: 48.8641, lng: 2.2966, by: 'a', createdAt: now - 4 * day },
  { id: 'ex5', title: 'Pique-nique aux Buttes-Chaumont', cat: 'activite', where: '19e', lat: 48.8809, lng: 2.3828, by: 'a', createdAt: now - 5 * day },
  { id: 'ex6', title: 'Le Voyage de Chihiro', cat: 'film', where: 'Netflix', by: 'b', createdAt: now - 6 * day },
  { id: 'ex7', title: 'Severance', cat: 'serie', where: 'Apple TV+', by: 'a', createdAt: now - 7 * day },
  { id: 'ex8', title: 'Acheter une plante pour le salon', cat: 'todo', where: 'Ce week-end', by: 'b', createdAt: now - 8 * day },
  { id: 'ex9', title: 'Crêperie à Montmartre', cat: 'resto', where: '18e', lat: 48.8867, lng: 2.3431, by: 'a', createdAt: now - 20 * day,
    done: true, doneAt: now - 10 * day, ra: 5, rb: 4, note: 'La complète au sarrasin, à refaire.' },
  { id: 'ex10', title: 'Past Lives', cat: 'film', where: 'Au cinéma', by: 'b', createdAt: now - 30 * day, done: true, doneAt: now - 12 * day, ra: 4, rb: 5 },
  { id: 'ex11', title: 'Escape game dans le Marais', cat: 'activite', where: '3e', lat: 48.859, lng: 2.362, by: 'b', createdAt: now - 25 * day,
    done: true, doneAt: now - 14 * day, ra: 4, rb: 3 },
].map((i) => ({ ...i, example: true }) as Item)

const initial = (): AppState => ({ items: SEED, names: { a: 'Toni', b: 'Ju' }, me: 'a' })

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...JSON.parse(raw) }
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
