import { CatIcon, cat } from '../cats'
import { avg, type Store } from '../store'
import { directionsUrl, googleDirectionsUrl } from '../search'
import { burst, Hearts } from './ui'
import { PlacePhotos } from './PlacePhotos'

const Ic = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
)
const PIN = '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'
const ARROW = '<path d="M3.5 11.2 20 4l-7.2 16.5-2.1-7.2z"/>'
const MAP = '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>'
const PEN = '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'
const BIN = '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'

/** Valeur d'un champ date (AAAA-MM-JJ, heure locale) */
const dayValue = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function Detail({ store, id, onClose, toast, onYesNo, onEdit }: {
  store: Store; id: string; onClose: () => void; toast: (m: string, undo?: () => void) => void; onYesNo: (q: string) => void; onEdit: () => void
}) {
  const { state, patch, remove, upsert } = store
  const item = state.items.find((i) => i.id === id)
  if (!item) return null
  const c = cat(item.cat)
  const a = avg(item)

  return (
    <div className="detail">
      {item.poster && <img className="poster" src={item.poster} alt="" />}
      <div className="detail-head">
        <h2 className="sheet-title">{item.title}</h2>
        <div className="meta">
          <span className="pill" style={{ background: c.bg, color: c.ink }}><CatIcon id={item.cat} size={15} />{c.label}</span>
          {item.where && <span className="pill">{item.where}</span>}
          <span className="pill">Idée de {state.names[item.by]}</span>
        </div>
      </div>
      <PlacePhotos item={item} />
      {item.note && <p className="desc">{item.note}</p>}

      {item.lat != null && item.lng != null && (
        <section className="block">
          {item.address && <p className="addr"><Ic d={PIN} size={16} />{item.address}</p>}
          <div className="go-btns">
            <a className="go-btn" href={directionsUrl(item.lat, item.lng, item.title)} target="_blank" rel="noreferrer"><Ic d={ARROW} />Plans</a>
            <a className="go-btn" href={googleDirectionsUrl(item.lat, item.lng, item.title, item.address)} target="_blank" rel="noreferrer"><Ic d={MAP} />Google Maps</a>
          </div>
        </section>
      )}
      {item.lat == null && item.address && <p className="addr"><Ic d={PIN} size={16} />{item.address}</p>}

      {item.done ? (
        <>
          <section className="block rating">
            <label className="done-date">
              <span>Fait le</span>
              <input type="date" value={dayValue(item.doneAt ?? Date.now())} max={dayValue(Date.now())}
                onChange={(e) => { if (e.target.value) patch(id, { doneAt: new Date(e.target.value + 'T12:00').getTime() }) }} />
            </label>
            <div className="rate"><b>{state.names.a}</b><Hearts label={`Note de ${state.names.a}`} value={item.ra ?? 0} onChange={(n) => patch(id, { ra: n })} /></div>
            <div className="rate"><b>{state.names.b}</b><Hearts label={`Note de ${state.names.b}`} value={item.rb ?? 0} onChange={(n) => patch(id, { rb: n })} /></div>
            <p className="avg">Moyenne <b>{a ? a.toFixed(1) : '–'}</b> / 5</p>
          </section>
          <button className="ghost" onClick={() => {
            const before = item
            patch(id, { done: false, doneAt: undefined, ra: undefined, rb: undefined }); onClose()
            toast('Remis dans « À faire »', () => upsert(before))
          }}>
            Remettre dans « À faire »
          </button>
        </>
      ) : (
        <div className="cta">
          <button className="primary" onClick={(e) => { burst(e.currentTarget); patch(id, { done: true, doneAt: Date.now() }); toast('Bravo ! Notez-le') }}>
            C'est fait !
          </button>
          <button className="ghost" onClick={() => onYesNo(`On fait « ${item.title} » ?`)}>On hésite ? Oui ou non</button>
        </div>
      )}
      <div className="detail-foot">
        <button className="soft" onClick={onEdit}><Ic d={PEN} />Modifier</button>
        <button className="soft danger" onClick={() => { const before = item; remove(id); onClose(); toast('Supprimé', () => upsert(before)) }}>
          <Ic d={BIN} />Supprimer
        </button>
      </div>
    </div>
  )
}
