// Photos des lieux.
// Par défaut : Wikipédia / Wikimedia Commons, gratuit et sans clé (lieux connus seulement).
// Si un jour une clé Google est ajoutée (secret GitHub GOOGLE_MAPS_KEY), Google Places prend le relais.
import type { Item } from './types'

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_KEY as string | undefined
const CACHE = 'toh-photos-v2'
const TTL = 7 * 86_400_000

export interface Photo { small: string; big: string }

type Entry = { at: number; photos: Photo[] }

function readCache(): Record<string, Entry> {
  try { return JSON.parse(localStorage.getItem(CACHE) ?? '{}') } catch { return {} }
}
function writeCache(id: string, photos: Photo[]) {
  try {
    const c = readCache()
    c[id] = { at: Date.now(), photos }
    localStorage.setItem(CACHE, JSON.stringify(c))
  } catch {}
}

const inflight = new Map<string, Promise<Photo[]>>()

export function placePhotos(item: Item): Promise<Photo[]> {
  if (item.lat == null || item.lng == null) return Promise.resolve([])
  const cached = readCache()[item.id]
  if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.photos)
  const running = inflight.get(item.id)
  if (running) return running
  const p = (GOOGLE_KEY ? fromGoogle(item, GOOGLE_KEY) : fromWikipedia(item))
    .then((photos) => { writeCache(item.id, photos); return photos })
    .catch(() => [] as Photo[])
    .finally(() => inflight.delete(item.id))
  inflight.set(item.id, p)
  return p
}

async function fromGoogle(item: Item, key: string): Promise<Photo[]> {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.photos.name' },
    body: JSON.stringify({
      textQuery: [item.title, item.address].filter(Boolean).join(', '),
      languageCode: 'fr',
      maxResultCount: 1,
      locationBias: { circle: { center: { latitude: item.lat, longitude: item.lng }, radius: 400 } },
    }),
  })
  if (!r.ok) throw new Error(String(r.status))
  const d = await r.json()
  const url = (name: string, w: number) => `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&key=${key}`
  return (d.places?.[0]?.photos ?? []).slice(0, 6).map((ph: { name: string }) => ({ small: url(ph.name, 640), big: url(ph.name, 1400) }))
}

const WIKI = 'https://fr.wikipedia.org/w/api.php?format=json&origin=*&action=query'

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}

const SKIP = /logo|icon|icône|pictogram|map|carte|plan[ _-]|flag|drapeau|blason|coat[ _]of|signature|commons-|wikidata|location|locator|\.svg/i

async function fromWikipedia(item: Item): Promise<Photo[]> {
  const here = { lat: item.lat!, lon: item.lng! }
  // 1. Trouver l'article Wikipédia du lieu : même nom, et situé à moins de 3 km.
  const s = await fetch(`${WIKI}&generator=search&gsrlimit=6&prop=coordinates&gsrsearch=${encodeURIComponent(item.title)}`).then((r) => r.json())
  const pages = Object.values<any>(s.query?.pages ?? {}).sort((a, b) => a.index - b.index)
  const page = pages.find((pg) => pg.coordinates?.[0] && km(here, pg.coordinates[0]) < 3)
  if (!page) return []
  // 2. Prendre les photos de l'article.
  const im = await fetch(
    `${WIKI}&generator=images&gimlimit=40&prop=imageinfo&iiprop=url|mime&iiurlwidth=640&titles=${encodeURIComponent(page.title)}`,
  ).then((r) => r.json())
  return Object.values<any>(im.query?.pages ?? {})
    .filter((f) => f.imageinfo?.[0]?.mime === 'image/jpeg' && !SKIP.test(f.title))
    .slice(0, 6)
    .map((f) => {
      const info = f.imageinfo[0]
      return { small: info.thumburl, big: String(info.thumburl).replace(/\/640px-/, '/1280px-') }
    })
}
