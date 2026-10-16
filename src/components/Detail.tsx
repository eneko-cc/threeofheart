import { useState } from 'react'
import { CatIcon, cat } from '../cats'
import { avg, type Store } from '../store'
import { directionsUrl } from '../search'
import { burst, Hearts } from './ui'
import { PlacePhotos } from './PlacePhotos'

export function Detail({ store, id, onClose, toast, onYesNo }: {
  store: Store; id: string; onClose: () => void; toast: (m: string) => void; onYesNo: (q: string) => void
}) {
  const { state, patch, remove } = store
  const item = state.items.find((i) => i.id === id)
  const [sure, setSure] = useState(false)
  if (!item) return null
  const c = cat(item.cat)
  const a = avg(item)

  return (
    <div className="detail">
      {item.poster && <img className="poster" src={item.poster} alt="" />}
      <h2 className="sheet-title">{item.title}</h2>
      <div className="meta">
        <span className="pill" style={{ background: c.bg, color: c.ink }}><CatIcon id={item.cat} size={15} />{c.label}</span>
        {item.where && <span className="pill">{item.where}</span>}
        <span className="pill">Idée de {state.names[item.by]}</span>
      </div>
      <PlacePhotos item={item} />
      {item.note && <p className="desc">{item.note}</p>}
      {item.address && <p className="addr">{item.address}</p>}
      {item.lat != null && item.lng != null && (
        <a className="secondary" href={directionsUrl(item.lat, item.lng, item.title)} target="_blank" rel="noreferrer">Y aller</a>
      )}

      {item.done ? (
        <>
          <div className="rate"><b>{state.names.a}</b><Hearts label={`Note de ${state.names.a}`} value={item.ra ?? 0} onChange={(n) => patch(id, { ra: n })} /></div>
          <div className="rate"><b>{state.names.b}</b><Hearts label={`Note de ${state.names.b}`} value={item.rb ?? 0} onChange={(n) => patch(id, { rb: n })} /></div>
          <p className="avg">Moyenne <b>{a ? a.toFixed(1) : '–'}</b> / 5</p>
          <button className="ghost" onClick={() => { patch(id, { done: false, doneAt: undefined, ra: undefined, rb: undefined }); onClose() }}>
            Remettre dans « À faire »
          </button>
        </>
      ) : (
        <button className="primary" onClick={(e) => { burst(e.currentTarget); patch(id, { done: true, doneAt: Date.now() }); toast('Bravo ! Notez-le') }}>
          C'est fait !
        </button>
      )}
      {!item.done && <button className="ghost" onClick={() => onYesNo(`On fait « ${item.title} » ?`)}>On hésite ? Oui ou non</button>}
      <button className="ghost danger" onClick={() => { if (sure) { remove(id); onClose(); toast('Supprimé') } else setSure(true) }}>
        {sure ? 'Appuie encore pour supprimer' : 'Supprimer'}
      </button>
    </div>
  )
}
