import { useEffect, useState } from 'react'
import { placePhotos, type Photo } from '../photos'
import type { Item } from '../types'

/** Bandeau de photos qui défile à l'horizontale, comme sur Google Maps. */
export function PlacePhotos({ item, compact = false }: { item: Item; compact?: boolean }) {
  const [names, setNames] = useState<Photo[] | null>(null)
  const [big, setBig] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setNames(null)
    placePhotos(item).then((n) => alive && setNames(n))
    return () => { alive = false }
  }, [item.id, item.lat, item.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  if (item.lat == null) return null
  const list = names ?? []
  if (names && !list.length) return null

  return (
    <>
      <div className={'photos' + (compact ? ' compact' : '')} aria-label={`Photos de ${item.title}`}>
        {names === null
          ? [0, 1, 2].map((k) => <span key={k} className="ph skel" />)
          : list.map((n, k) => (
              <button key={n.small} className="ph" style={{ animationDelay: `${k * 60}ms` }} onClick={(e) => { e.stopPropagation(); setBig(n.big) }}>
                <img src={n.small} alt="" loading="lazy" />
              </button>
            ))}
      </div>
      {big && (
        <button className="ph-full" onClick={() => setBig(null)} aria-label="Fermer la photo">
          <img src={big} alt="" />
        </button>
      )}
    </>
  )
}
