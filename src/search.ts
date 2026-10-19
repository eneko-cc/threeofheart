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

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${PARIS.lat}&lon=${PARIS.lng}&limit=6&lang=fr`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('photon')
  const data = await res.json()
  return (data.features ?? []).map((f: any) => {
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
  })
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
export const googleDirectionsUrl = (lat: number, lng: number, name: string, address?: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address ? `${name}, ${address}` : `${lat},${lng}`)}`
