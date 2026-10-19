// Services gratuits et sans clé : Photon (OpenStreetMap) pour les adresses, Wikipédia pour les affiches.

export interface Place {
  label: string
  sub: string
  where: string
  address: string
  lat: number
  lng: number
}

const PARIS = { lat: 48.8566, lng: 2.3522 }

function arrondissement(postcode?: string) {
  const m = postcode?.match(/^750(\d\d)$/)
  if (!m) return undefined
  const n = parseInt(m[1], 10)
  return n === 1 ? '1er' : `${n}e`
}

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180))

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Premier lieu trouvé à moins de 25 km de Paris, pour épingler une idée tapée sans choisir dans la liste. */
export async function geocode(q: string, ms = 4000): Promise<Place | undefined> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    // le nom trouvé doit vraiment correspondre à ce qui a été tapé (évite d'épingler « un bowling » au hasard)
    const words = norm(q).split(' ').filter((w) => w.length > 2)
    return (await searchPlaces(q, ctrl.signal)).find((p) => km(p, PARIS) < 25 && words.length > 0
      && words.every((w) => norm(`${p.label} ${p.address}`).includes(w)) && norm(p.label).length <= norm(q).length + 12)
  } catch {
    return undefined
  } finally {
    clearTimeout(t)
  }
}

const KINDS: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Pub', fast_food: 'Fast-food', ice_cream: 'Glacier', bakery: 'Boulangerie',
  pastry: 'Pâtisserie', biergarten: 'Bar', food_court: 'Food court', wine_bar: 'Bar à vin', nightclub: 'Club', cinema: 'Cinéma', theatre: 'Théâtre',
  museum: 'Musée', gallery: 'Galerie', arts_centre: 'Lieu culturel', attraction: 'Attraction', park: 'Parc', garden: 'Jardin', zoo: 'Zoo',
  bowling_alley: 'Bowling', escape_game: 'Escape game', sports_centre: 'Sport', swimming_pool: 'Piscine', viewpoint: 'Point de vue',
  hotel: 'Hôtel', concert_hall: 'Salle de concert', events_venue: 'Salle', marketplace: 'Marché', house: 'Adresse', street: 'Rue',
}
const FOOD = new Set(['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'ice_cream', 'bakery', 'pastry', 'biergarten', 'food_court', 'wine_bar'])

function toPlace(f: any, q = ''): Place {
  const p = f.properties ?? {}
  const street = [p.housenumber, p.street].filter(Boolean).join(' ')
  const address = [street || (p.name !== p.street ? undefined : p.name), p.postcode, p.city].filter(Boolean).join(', ')
  const where = arrondissement(p.postcode) ?? p.district ?? p.city ?? ''
  return {
    label: p.name ?? street ?? q,
    sub: [street, p.district ?? arrondissement(p.postcode), p.city].filter(Boolean).join(' · '),
    where,
    address,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }
}

// Île-de-France d'abord, puis la France entière : jamais de résultat à l'autre bout du monde.
const IDF = '1.4,48.1,3.6,49.25'
const FRANCE = '-5.3,41.3,9.7,51.2'

/** Où on est, seulement si l'iPhone l'a déjà autorisé (aucune demande surprise). */
let here: { lat: number; lng: number } | null = null
async function whereAmI() {
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    if (perm?.state !== 'granted') return
    navigator.geolocation.getCurrentPosition((g) => { here = { lat: g.coords.latitude, lng: g.coords.longitude } }, () => {}, { maximumAge: 600000, timeout: 5000 })
  } catch {}
}
void whereAmI()

const fmtKm = (d: number) => (d < 1 ? `${Math.round(d * 1000 / 50) * 50} m` : `${d.toFixed(d < 10 ? 1 : 0).replace('.', ',')} km`)

async function photon(q: string, bbox: string, center: { lat: number; lng: number }, signal?: AbortSignal) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${center.lat}&lon=${center.lng}&bbox=${bbox}&limit=15&lang=fr`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('photon')
  return ((await res.json()).features ?? []) as any[]
}

/**
 * Recherche de lieux pensée pour Paris : on cherche en Île-de-France (puis en France si rien),
 * on classe par ressemblance du nom, type de lieu et proximité, et on affiche type, quartier et distance.
 */
export async function searchPlaces(q: string, signal?: AbortSignal, opts: { food?: boolean } = {}): Promise<Place[]> {
  const center = here ?? PARIS
  let feats = await photon(q, IDF, center, signal)
  if (feats.length < 3) feats = [...feats, ...(await photon(q, FRANCE, center, signal))]
  const nq = norm(q)
  const seen = new Set<string>()
  const scored = feats
    .filter((f) => !f.properties?.countrycode || f.properties.countrycode === 'FR')
    .map((f) => {
      const pl = toPlace(f, q)
      const pr = f.properties ?? {}
      const name = norm(pr.name ?? '')
      const d = km(pl, center)
      let score = Math.min(d, 60) / 3 // un peu plus près, un peu mieux
      if (name === nq) score -= 30
      else if (name.startsWith(nq)) score -= 20
      else if (name.includes(nq)) score -= 10
      if (!pr.name) score += 8 // simple rue ou ville
      if (opts.food) score += FOOD.has(pr.osm_value) ? -12 : 4
      else if (KINDS[pr.osm_value] && pr.osm_value !== 'house' && pr.osm_value !== 'street') score -= 4
      const kind = KINDS[pr.osm_value]
      const quartier = arrondissement(pr.postcode) ?? pr.district ?? pr.city
      const sub = [kind, [pr.housenumber, pr.street].filter(Boolean).join(' ') || undefined, quartier, fmtKm(d)].filter(Boolean).join(' · ')
      return { pl: { ...pl, sub }, score, key: `${name}|${pl.lat.toFixed(3)}|${pl.lng.toFixed(3)}` }
    })
    .sort((a, b) => a.score - b.score)
    .filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true)))
  return scored.slice(0, 6).map((x) => x.pl)
}

/** Adresse la plus proche d'un point posé à la main sur la carte. */
export async function reverse(lat: number, lng: number): Promise<Place | undefined> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=fr`, { signal: ctrl.signal })
    const f = (await res.json()).features?.[0]
    return f ? { ...toPlace(f), lat, lng } : undefined
  } catch {
    return undefined
  } finally {
    clearTimeout(t)
  }
}

export interface Work {
  title: string
  sub: string
  poster?: string
}

export async function searchWorks(q: string, kind: 'film' | 'serie', signal?: AbortSignal): Promise<Work[]> {
  const term = `${q} ${kind === 'film' ? 'film' : 'série télévisée'}`
  const url =
    'https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=6' +
    '&prop=pageimages|description&piprop=thumbnail&pithumbsize=360&gsrsearch=' + encodeURIComponent(term)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('wiki')
  const data = await res.json()
  const pages = Object.values<any>(data.query?.pages ?? {}).sort((a, b) => a.index - b.index)
  return pages.map((p) => ({
    title: String(p.title).replace(/\s*\((film|série télévisée)[^)]*\)$/i, ''),
    sub: p.description ?? '',
    poster: p.thumbnail?.source,
  }))
}

export const directionsUrl = (lat: number, lng: number, name: string) =>
  `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`

/** Itinéraire Google Maps (ouvre l'app Google Maps si elle est installée). */
export const wazeUrl = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`

export const googleDirectionsUrl = (lat: number, lng: number, name: string, address?: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address ? `${name}, ${address}` : `${lat},${lng}`)}`
