import { useEffect, useState } from 'react'
import { photosEnabled, photoUrl, placePhotoNames } from '../photos'
import type { Item } from '../types'

/** Bandeau de photos qui défile à l'horizontale, comme sur Google Maps. */
export function PlacePhotos({ item, compact = false }: { item: Item; compact?: boolean }) {
  const [names, setNames] = useState<string[] | null>(null)
  const [big, setBig] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setNames(null)
    placePhotoNames(item).then((n) => alive && setNames(n))
    return () => { alive = false }
  }, [item.id, item.lat, item.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!photosEnabled || item.lat == null) return null
  const list = names ?? []
  if (names && !list.length) return null

  return (
    <>
      <div className={'photos' + (compact ? ' compact' : '')} aria-label={`Photos de ${item.title}`}>
        {names === null
          ? [0, 1, 2].map((k) => <span key={k} className="ph skel" />)
          : list.map((n, k) => (
              <button key={n} className="ph" style={{ animationDelay: `${k * 60}ms` }} onClick={(e) => { e.stopPropagation(); setBig(n) }}>
                <img src={photoUrl(n, compact ? 400 : 640)} alt="" loading="lazy" />
              </button>
            ))}
      </div>
      {big && (
        <button className="ph-full" onClick={() => setBig(null)} aria-label="Fermer la photo">
          <img src={photoUrl(big, 1200)} alt="" />
        </button>
      )}
    </>
  )
}
