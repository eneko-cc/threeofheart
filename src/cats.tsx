import type { CatId } from './types'

export interface Cat {
  id: CatId
  label: string
  plural: string
  /** Couleur de fond des cartes */
  bg: string
  /** Couleur des épingles et pastilles */
  pin: string
  place: boolean
  icon: string
}

export const CATS: Cat[] = [
  { id: 'resto', label: 'Resto', plural: 'Restos', bg: 'var(--c-pink)', pin: '#E58AA5', place: true,
    icon: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 6s1 4 3 4v8"/>' },
  { id: 'activite', label: 'Activité', plural: 'Activités', bg: 'var(--c-mint)', pin: '#6DB58A', place: true,
    icon: '<path d="M12 3l2.4 5.3 5.6.6-4.2 3.8 1.2 5.6L12 15.5 7 18.3l1.2-5.6L4 8.9l5.6-.6z"/>' },
  { id: 'event', label: 'Événement', plural: 'Événements', bg: 'var(--c-butter)', pin: '#E2B23C', place: true,
    icon: '<path d="M4 8a2 2 0 0 0 0 4v5h16v-5a2 2 0 0 1 0-4V5H4z"/><path d="M14 5v12" stroke-dasharray="2 2"/>' },
  { id: 'film', label: 'Film', plural: 'Films', bg: 'var(--c-blue)', pin: '#6FA3CF', place: false,
    icon: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 8l3-4h4l-3 4M10 8l3-4h4l-3 4"/>' },
  { id: 'serie', label: 'Série', plural: 'Séries', bg: 'var(--c-lilac)', pin: '#9C8CD6', place: false,
    icon: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M8 21h8M9 2l3 4 3-4"/>' },
  { id: 'todo', label: 'À faire', plural: 'À faire', bg: 'var(--c-sand)', pin: '#1F4D3A', place: false,
    icon: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>' },
]

export const cat = (id: CatId) => CATS.find((c) => c.id === id)!

export function CatIcon({ id, size = 22 }: { id: CatId; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: cat(id).icon }} />
  )
}

export const HEART_PATH = 'M12 21C5 16 2 12.5 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5c0 4-3 7.5-10 12.5z'

export function Heart({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d={HEART_PATH} />
    </svg>
  )
}
