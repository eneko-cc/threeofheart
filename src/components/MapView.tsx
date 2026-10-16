import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cat, HEART_PATH } from '../cats'
import type { Store } from '../store'
import type { CatId } from '../types'
import { Chips } from './ListView'
import { ItemCard } from './ui'

// Fond de carte OpenFreeMap (gratuit, sans clé), recoloré aux couleurs de l'app.
const STYLE = 'https://tiles.openfreemap.org/styles/positron'

function palette() {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches
  return dark
    ? { land: '#14291F', water: '#2B4D66', park: '#24503D', road: '#21443A', building: '#1A3529' }
    : { land: '#FBF3F5', water: '#B9D6EF', park: '#CFE6D7', road: '#FFFFFF', building: '#F3E4E9' }
}

function recolor(map: maplibregl.Map) {
  const p = palette()
  for (const l of map.getStyle().layers ?? []) {
    const id = l.id.toLowerCase()
    try {
      if (l.type === 'background') map.setPaintProperty(l.id, 'background-color', p.land)
      else if (l.type === 'fill' && id.includes('water')) map.setPaintProperty(l.id, 'fill-color', p.water)
      else if (l.type === 'line' && id.includes('water')) map.setPaintProperty(l.id, 'line-color', p.water)
      else if (l.type === 'fill' && /park|wood|grass|landcover|cemetery|pitch/.test(id)) map.setPaintProperty(l.id, 'fill-color', p.park)
      else if (l.type === 'fill' && id.includes('building')) map.setPaintProperty(l.id, 'fill-color', p.building)
      else if (l.type === 'fill' && id.includes('landuse')) map.setPaintProperty(l.id, 'fill-color', p.land)
      else if (l.type === 'line' && /highway|road|street|path|tunnel|bridge/.test(id)) map.setPaintProperty(l.id, 'line-color', p.road)
    } catch {}
  }
}

function pinEl(color: string, done: boolean, delay: number) {
  const el = document.createElement('button')
  el.className = 'pin'
  el.innerHTML = `<span class="pin-in" style="animation-delay:${delay}ms"><svg viewBox="0 0 38 46"><path d="M19 45C8 33 2 25 2 17a17 17 0 0 1 34 0c0 8-6 16-17 28z" fill="${done ? '#B7C4BD' : color}" stroke="#fff" stroke-width="2.5"/><g transform="translate(10.5 8.5) scale(.7)"><path d="${HEART_PATH}" fill="#fff"/></g></svg></span>`
  return el
}

export function MapView({ store, active, onOpen }: { store: Store; active: boolean; onOpen: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [filter, setFilter] = useState<CatId | 'all'>('all')
  const [showDone, setShowDone] = useState(true)
  const [sel, setSel] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!box.current || map.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: [2.3488, 48.8634],
      zoom: 12.2,
      attributionControl: { compact: true },
    })
    m.on('style.load', () => recolor(m))
    m.on('error', (e) => { if (String(e.error?.message ?? '').includes('Failed to fetch')) setFailed(true) })
    m.on('click', () => setSel(null))
    const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false })
    m.addControl(geo, 'bottom-right')
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  useEffect(() => {
    if (active) setTimeout(() => map.current?.resize(), 50)
  }, [active])

  const places = store.state.items.filter(
    (i) => i.lat != null && i.lng != null && (filter === 'all' || i.cat === filter) && (showDone || !i.done),
  )

  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((mk) => mk.remove())
    markers.current = places.map((i, k) => {
      const el = pinEl(cat(i.cat).pin, !!i.done, k * 50)
      el.setAttribute('aria-label', i.title)
      if (sel === i.id) el.classList.add('sel')
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSel(i.id)
        m.easeTo({ center: [i.lng!, i.lat!], duration: 500 })
      })
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([i.lng!, i.lat!]).addTo(m)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(places.map((p) => [p.id, p.lat, p.lng, p.done, p.cat])), sel])

  const selected = store.state.items.find((i) => i.id === sel)

  return (
    <div className="mapwrap">
      <div ref={box} className="map" />
      <div className="map-top">
        <Chips value={filter} onChange={(f) => { setFilter(f); setSel(null) }} only={['resto', 'activite', 'event']} />
        <button className="chip ghosty" aria-pressed={!showDone} onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Masquer les faits' : 'Voir les faits'}
        </button>
      </div>
      {failed && <p className="map-msg">La carte ne charge pas. Vérifie ta connexion.</p>}
      <div className={'peek' + (selected ? ' on' : '')}>
        {selected && <ItemCard item={selected} state={store.state} onOpen={() => onOpen(selected.id)} />}
      </div>
    </div>
  )
}
