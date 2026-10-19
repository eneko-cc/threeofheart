export type CatId = 'activite' | 'resto' | 'event' | 'film' | 'serie' | 'todo'
export type Who = 'a' | 'b'

export interface Item {
  id: string
  title: string
  cat: CatId
  /** Quartier, plateforme ou moment, affiché sous le titre */
  where?: string
  address?: string
  lat?: number
  lng?: number
  note?: string
  poster?: string
  by: Who
  createdAt: number
  done?: boolean
  doneAt?: number
  /** Notes de 1 à 5 cœurs, une par personne */
  ra?: number
  rb?: number
  example?: boolean

}

export interface AppState {
  items: Item[]
  names: { a: string; b: string }
  /** À qui appartient ce téléphone */
  me: Who
  /** Version des données, pour les migrations */
  v?: number
}
