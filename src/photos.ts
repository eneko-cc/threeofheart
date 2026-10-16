// Photos des lieux via Google Places (API « New »). La clé est injectée à la mise en ligne
// (secret GitHub GOOGLE_MAPS_KEY) et limitée au site de l'app dans Google Cloud.
import type { Item } from './types'

const KEY = import.meta.env.VITE_GOOGLE_KEY as string | undefined
const CACHE = 'toh-photos-v1'
const TTL = 7 * 86_400_000

export const photosEnabled = !!KEY

type Entry = { at: number; names: string[] }

function readCache(): Record<string, Entry> {
  try { return JSON.parse(localStorage.getItem(CACHE) ?? '{}') } catch { return {} }
}
function writeCache(id: string, names: string[]) {
  try {
    const c = readCache()
    c[id] = { at: Date.now(), names }
    localStorage.setItem(CACHE, JSON.stringify(c))
  } catch {}
}

const inflight = new Map<string, Promise<string[]>>()

/** Noms de photos Google pour un lieu (mis en cache une semaine pour économiser les requêtes). */
export function placePhotoNames(item: Item): Promise<string[]> {
  if (!KEY || item.lat == null || item.lng == null) return Promise.resolve([])
  const cached = readCache()[item.id]
  if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.names)
  const running = inflight.get(item.id)
  if (running) return running

  const p = fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.id,places.photos.name',
    },
    body: JSON.stringify({
      textQuery: [item.title, item.address].filter(Boolean).join(', '),
      languageCode: 'fr',
      maxResultCount: 1,
      locationBias: { circle: { center: { latitude: item.lat, longitude: item.lng }, radius: 400 } },
    }),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d) => {
      const names: string[] = (d.places?.[0]?.photos ?? []).slice(0, 6).map((ph: { name: string }) => ph.name)
      writeCache(item.id, names)
      return names
    })
    .catch(() => [] as string[])
    .finally(() => inflight.delete(item.id))
  inflight.set(item.id, p)
  return p
}

export const photoUrl = (name: string, width = 640) =>
  `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${width}&key=${KEY}`
