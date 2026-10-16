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
