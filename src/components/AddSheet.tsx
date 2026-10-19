import { useEffect, useRef, useState } from 'react'
import { CATS, CatIcon, cat } from '../cats'
import { newId, type Store } from '../store'
import { geocode, searchPlaces, searchWorks, type Place, type Work } from '../search'
import type { CatId, Item } from '../types'
import { PinPicker } from './PinPicker'

type Suggestion = { kind: 'place'; p: Place } | { kind: 'work'; w: Work }

/** Saisie en cours, gardée quand on referme la feuille sans ajouter. */
export interface Draft { c: CatId; title: string; where: string; note: string; place: Place | null; poster?: string }

/** Ajout d'une idée, ou modification quand `edit` est fourni. */
export function AddSheet({ store, initialCat, edit, draft, onDraft, onDone }: {
  store: Store; initialCat?: CatId; edit?: Item; draft?: Draft | null; onDraft?: (d: Draft | null) => void; onDone: (item: Item) => void
}) {
  const [c, setC] = useState<CatId>(edit?.cat ?? draft?.c ?? initialCat ?? 'resto')
  const [title, setTitle] = useState(edit?.title ?? draft?.title ?? '')
  const [where, setWhere] = useState(edit?.where ?? draft?.where ?? '')
  const [note, setNote] = useState(edit?.note ?? draft?.note ?? '')
  const [place, setPlace] = useState<Place | null>(draft?.place ?? null)
  const [poster, setPoster] = useState<string | undefined>(edit?.poster ?? draft?.poster)
  const [sugg, setSugg] = useState<Suggestion[]>([])
  // une idée de lieu pas encore épinglée rouvre avec les suggestions, pour la placer facilement
  const [picked, setPicked] = useState((!!edit && !(cat(edit.cat).place && edit.lat == null)) || !!draft?.place || !!draft?.poster)
  const [offline, setOffline] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fromDraft, setFromDraft] = useState(!!draft && !edit)
  const [picking, setPicking] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const meta = cat(c)

  useEffect(() => { if (!edit) setTimeout(() => input.current?.focus(), 400) }, [edit])
  useEffect(() => {
    if (edit || saved) return
    onDraft?.(title.trim() || where.trim() || note.trim() ? { c, title, where, note, place, poster } : null)
  }, [c, title, where, note, place, poster, edit, saved, onDraft])

  useEffect(() => {
    setSugg([])
    if (picked || title.trim().length < 3 || c === 'todo') return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        if (meta.place) {
          const ps = await searchPlaces(title.trim(), ctrl.signal, { food: c === 'resto' })
          setSugg(ps.map((p) => ({ kind: 'place', p })))
        } else {
          const ws = await searchWorks(title.trim(), c as 'film' | 'serie', ctrl.signal)
          setSugg(ws.map((w) => ({ kind: 'work', w })))
        }
        setOffline(false)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setOffline(true)
      }
    }, 350)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [title, c, picked, meta.place])

  const pick = (s: Suggestion) => {
    setPicked(true)
    setSugg([])
    if (s.kind === 'place') {
      setTitle(s.p.label)
      setWhere(s.p.where)
      setPlace(s.p)
    } else {
      setTitle(s.w.title)
      setPoster(s.w.poster)
    }
  }

  const save = async () => {
    setSaved(true)
    // en modification, on garde l'épingle d'origine tant qu'aucun nouveau lieu n'est choisi
    let found = place
    // lieu tapé sans le choisir dans la liste : on le cherche quand même pour l'épingler
    if (!found && meta.place && edit?.lat == null) found = (await geocode(title.trim())) ?? null
    const geo = found ? { lat: found.lat, lng: found.lng, address: found.address }
      : edit?.lat != null ? { lat: edit.lat, lng: edit.lng, address: edit.address } : {}
    const item: Item = {
      ...edit,
      id: edit?.id ?? newId(),
      title: title.trim(),
      cat: c,
      where: where.trim() || (!place && found ? found.where || undefined : undefined),
      note: note.trim() || undefined,
      by: edit?.by ?? store.state.me,
      createdAt: edit?.createdAt ?? Date.now(),
      lat: undefined, lng: undefined, address: undefined, poster: undefined,
      ...(meta.place ? geo : {}),
      ...(poster && !meta.place ? { poster } : {}),
    }
    setTimeout(() => { store.upsert(item); onDone(item) }, 520)
  }

  const whereLabel = meta.place ? 'Quartier' : c === 'todo' ? 'Quand ?' : 'Où le regarder ?'
  const wherePh = meta.place ? 'Ex. 11e, Canal Saint-Martin' : c === 'todo' ? 'Ex. ce week-end' : 'Ex. Netflix, au cinéma'

  if (picking) {
    return (
      <div className="add">
        <h2 className="sheet-title">Placer sur la carte</h2>
        <PinPicker label={title.trim()} start={place ?? (edit?.lat != null ? { lat: edit.lat, lng: edit.lng! } : undefined)}
          onCancel={() => setPicking(false)}
          onPick={(p) => { setPlace(p); setPicked(true); if (!where.trim() && p.where) setWhere(p.where); setPicking(false) }} />
      </div>
    )
  }

  return (
    <div className="add">
      <h2 className="sheet-title">{edit ? 'Modifier' : 'Nouvelle idée'}</h2>
      {fromDraft && (
        <button className="draft-clear" onClick={() => { setFromDraft(false); setTitle(''); setWhere(''); setNote(''); setPlace(null); setPoster(undefined); setPicked(false) }}>
          Brouillon repris · Tout effacer
        </button>
      )}
      <div className="cat-grid">
        {CATS.map((k) => (
          <button key={k.id} className="cat" aria-pressed={k.id === c} style={{ background: k.bg, color: k.ink }}
            onClick={() => { if (k.id === c) return; setC(k.id); setPicked(false); setPlace(null); if (!edit || cat(k.id).place) setPoster(undefined) }}>
            <CatIcon id={k.id} size={20} />{k.label}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="f-title">{meta.place ? 'Nom ou adresse' : c === 'todo' ? 'Quoi ?' : 'Titre'}</label>
        <input ref={input} id="f-title" autoComplete="off" value={title}
          placeholder={meta.place ? 'Ex. ramen rue Sainte-Anne' : c === 'todo' ? 'Ex. réserver le resto pour son anniv' : 'Ex. Le Voyage de Chihiro'}
          onChange={(e) => { setTitle(e.target.value); setPicked(false); setPlace(null); setPoster(edit?.poster) }} />
        {sugg.length > 0 && (
          <ul className="sugg">
            {sugg.map((s, k) => (
              <li key={k}>
                <button onClick={() => pick(s)}>
                  {s.kind === 'work' && (s.w.poster ? <img src={s.w.poster} alt="" /> : <span className="noimg" />)}
                  <span>
                    <b>{s.kind === 'place' ? s.p.label : s.w.title}</b>
                    <small>{s.kind === 'place' ? s.p.sub : s.w.sub}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {place && <p className="hint ok">Épinglé sur la carte{place.address || place.sub ? ` : ${place.address || place.sub}` : ''}</p>}
        {!place && edit?.lat != null && meta.place && <p className="hint ok">Toujours épinglé sur la carte. Tape un autre lieu pour le déplacer.</p>}
        {meta.place && !place && edit?.lat == null && title.length > 2 && !offline && <p className="hint">{sugg.length ? 'Pas le bon ? Ajoute le quartier ou la rue, ex. « Nomas 11e ».' : "Choisis un lieu dans la liste, sinon on cherchera l'adresse pour l'épingler."}</p>}
        {offline && <p className="hint">Recherche indisponible, tu peux quand même l'ajouter.</p>}
        {meta.place && title.trim().length > 1 && (
          <button className="link-btn" onClick={() => { setSugg([]); setPicking(true) }}>
            {place || edit?.lat != null ? "Ajuster l'emplacement sur la carte" : 'Pas dans la liste ? Le placer sur la carte'}
          </button>
        )}
      </div>
      <div className="field">
        <label htmlFor="f-where">{whereLabel}</label>
        <input id="f-where" autoComplete="off" placeholder={wherePh} value={where} onChange={(e) => setWhere(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="f-note">Un petit mot</label>
        <textarea id="f-note" placeholder="Pourquoi ça nous tente" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className={'primary' + (saved ? ' saved' : '')} disabled={!title.trim() || saved} onClick={save}>
        {saved ? (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-label="Ajouté"><path className="draw" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        ) : edit ? 'Enregistrer' : 'Ajouter à notre liste'}
      </button>
    </div>
  )
}
