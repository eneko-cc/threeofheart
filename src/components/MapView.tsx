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
    ? { land: '#14291F', water: '#2B4D66', park: '#1E4434', road: '#1C382C', major: '#24493A', building: '#183326', text: '#86A193' }
    : { land: '#FBF3F5', water: '#B9D6EF', park: '#CFE6D7', road: '#FFFFFF', major: '#FFFFFF', building: '#F4E6EB', text: '#8A9B93' }
}

const FR_NAME = ['coalesce', ['get', 'name:fr'], ['get', 'name_int'], ['get', 'name']]

/** Carte apaisée : on garde l'eau, les parcs, les rues en ton sur ton, et on cache rails, frontières et pictos. */
function recolor(map: maplibregl.Map) {
  const p = palette()
  const set = (id: string, prop: string, v: unknown) => { try { map.setPaintProperty(id, prop, v) } catch {} }
  const hide = (id: string) => { try { map.setLayoutProperty(id, 'visibility', 'none') } catch {} }
  for (const l of map.getStyle().layers ?? []) {
    const id = l.id.toLowerCase()
    const src = ((l as { 'source-layer'?: string })['source-layer'] ?? '').toLowerCase()
    if (l.type === 'background') set(l.id, 'background-color', p.land)
    else if (/rail|transit|aeroway|boundary|shield|ferry|aerialway/.test(id) || /boundary|aeroway/.test(src)) hide(l.id)
    else if (l.type === 'fill' && (src === 'water' || id.includes('water'))) set(l.id, 'fill-color', p.water)
    else if (l.type === 'line' && (src === 'waterway' || id.includes('water'))) set(l.id, 'line-color', p.water)
    else if (l.type === 'fill' && (src === 'park' || src === 'landcover' || /park|wood|grass|cemetery|pitch/.test(id))) {
      set(l.id, 'fill-color', p.park); set(l.id, 'fill-opacity', 1); set(l.id, 'fill-outline-color', p.park)
    } else if (l.type === 'fill' && src === 'building') {
      set(l.id, 'fill-color', p.building); set(l.id, 'fill-outline-color', p.building)
    } else if (l.type === 'fill' && src === 'landuse') set(l.id, 'fill-opacity', 0)
    else if (l.type === 'line' && src === 'transportation') {
      if (id.includes('casing')) hide(l.id)
      else set(l.id, 'line-color', /motorway|major|trunk|primary/.test(id) ? p.major : p.road)
    } else if (l.type === 'symbol') {
      if (src === 'poi' || src === 'transportation_name' && /motorway/.test(id)) { hide(l.id); continue }
      set(l.id, 'text-color', p.text); set(l.id, 'text-halo-color', p.land); set(l.id, 'text-halo-width', 1.4)
      try { if (map.getLayoutProperty(l.id, 'text-field')) map.setLayoutProperty(l.id, 'text-field', FR_NAME) } catch {}
    }
  }
}

function pinEl(color: string, done: boolean, delay: number) {
  const el = document.createElement('button')
  el.className = 'pin' + (done ? ' done' : '')
  const glyph = done
    ? '<path d="M12.5 17.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
    : `<g transform="translate(10.5 8.5) scale(.7)"><path d="${HEART_PATH}" fill="#fff"/></g>`
  el.innerHTML = `<span class="pin-in" style="animation-delay:${delay}ms"><svg viewBox="0 0 38 46"><path d="M19 45C8 33 2 25 2 17a17 17 0 0 1 34 0c0 8-6 16-17 28z" fill="${done ? '#1F4D3A' : color}" stroke="#fff" stroke-width="2.5"/>${glyph}</svg></span>`
  return el
}

export function MapView({ store, active, onOpen }: { store: Store; active: boolean; onOpen: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [filter, setFilter] = useState<CatId | 'all'>('all')
  const [status, setStatus] = useState<'todo' | 'all' | 'done'>('all')
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
    (i) => i.lat != null && i.lng != null && (filter === 'all' || i.cat === filter) && (status === 'all' || (status === 'done') === !!i.done),
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
        <div className="status" role="group" aria-label="Afficher">
          <button aria-pressed={status === 'todo'} onClick={() => { setStatus('todo'); setSel(null) }}><span className="lg heart" />À tester</button>
          <button aria-pressed={status === 'all'} onClick={() => { setStatus('all'); setSel(null) }}>Tous</button>
          <button aria-pressed={status === 'done'} onClick={() => { setStatus('done'); setSel(null) }}><span className="lg check" />Faits</button>
        </div>
      </div>
      {failed && <p className="map-msg">La carte ne charge pas. Vérifie ta connexion.</p>}
      <div className={'peek' + (selected ? ' on' : '')}>
        {selected && <ItemCard item={selected} state={store.state} onOpen={() => onOpen(selected.id)} />}
      </div>
    </div>
  )
}
