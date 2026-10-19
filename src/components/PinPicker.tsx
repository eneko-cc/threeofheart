import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { HEART_PATH } from '../cats'
import { reverse, searchPlaces, type Place } from '../search'
import { recolor, STYLE } from './MapView'

/** Pour un lieu que la recherche ne connaît pas : on déplace la carte sous l'épingle, puis « Placer ici ». */
export function PinPicker({ label, start, onPick, onCancel }: {
  label: string; start?: { lat: number; lng: number }; onPick: (p: Place) => void; onCancel: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Place[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current, style: STYLE, attributionControl: false,
      center: start ? [start.lng, start.lat] : [2.3488, 48.8634], zoom: start ? 16 : 12.5,
    })
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    m.on('style.load', () => recolor(m))
    m.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'bottom-right')
    map.current = m
    return () => { m.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // les gestes sur la carte ne doivent pas refermer la feuille
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const stop = (e: Event) => e.stopPropagation()
    for (const t of ['touchstart', 'touchmove', 'touchend']) el.addEventListener(t, stop)
    return () => { for (const t of ['touchstart', 'touchmove', 'touchend']) el.removeEventListener(t, stop) }
  }, [])

  // recherche d'une rue ou d'un repère pour aller vite au bon endroit
  useEffect(() => {
    setHits([])
    if (q.trim().length < 3) return
    const ctrl = new AbortController()
    const t = setTimeout(() => searchPlaces(q.trim(), ctrl.signal).then(setHits).catch(() => {}), 350)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  const confirm = async () => {
    const c = map.current?.getCenter()
    if (!c) return
    setBusy(true)
    const near = await reverse(c.lat, c.lng)
    onPick({ label, sub: near?.sub ?? '', where: near?.where ?? '', address: near?.address ?? '', lat: c.lat, lng: c.lng })
  }

  return (
    <div className="picker">
      <div className="field">
        <label htmlFor="f-pick">Aller à une adresse</label>
        <input id="f-pick" type="search" autoComplete="off" placeholder="Ex. 4 place de la Madeleine" value={q} onChange={(e) => setQ(e.target.value)} />
        {hits.length > 0 && (
          <ul className="sugg">
            {hits.map((h, k) => (
              <li key={k}>
                <button onClick={() => { setHits([]); setQ(h.address || h.label); map.current?.flyTo({ center: [h.lng, h.lat], zoom: 17, duration: 700 }) }}>
                  <span><b>{h.label}</b><small>{h.sub}</small></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={wrap} className="picker-map">
        <div ref={box} className="map" />
        <svg className="picker-pin" viewBox="0 0 38 46" aria-hidden="true">
          <path d="M19 45C8 33 2 25 2 17a17 17 0 0 1 34 0c0 8-6 16-17 28z" style={{ fill: 'var(--pin-resto)' }} stroke="#fff" strokeWidth="2.5" />
          <g transform="translate(10.5 8.5) scale(.7)"><path d={HEART_PATH} fill="#fff" /></g>
        </svg>
      </div>
      <p className="hint">Déplace la carte pour mettre l'épingle sur « {label || 'le lieu'} ».</p>
      <div className="duo-btns">
        <button className="soft" onClick={onCancel}>Annuler</button>
        <button className="primary" onClick={confirm} disabled={busy}>{busy ? '…' : 'Placer ici'}</button>
      </div>
    </div>
  )
}
