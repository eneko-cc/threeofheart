import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { newId, type Store } from '../store'
import type { Item } from '../types'
import { burst } from './ui'
import { OTHER, aisleOf, aislesFor, learn, learnedAisle, norm, type List } from '../aisles'

const DEFAULTS: Record<List, string[]> = {
  courses: ['Lait', 'Pain', 'Œufs', 'Pâtes', 'Bananes', 'Café', 'Papier toilette', 'Lessive'],
  achats: ['Ampoules', 'Multiprise', 'Plaid', 'Cadre photo', 'Poêle', 'Serviettes de bain'],
}
const TEXT: Record<List, { title: string; ph: string; emptyIc: string; empty: string; cart: string; cartIc: string; all: string; count: (n: number) => string }> = {
  courses: { title: 'Courses', ph: 'Ajouter, ex. 2 avocats', emptyIc: '🧺', empty: "La liste est vide. Ajoute ce qui manque, l'autre le verra tout de suite.",
    cart: 'Dans le panier', cartIc: '🛒', all: 'Tout est dans le panier', count: (n) => (n ? `${n} à acheter` : 'Rien à acheter') },
  achats: { title: 'Achats', ph: 'Ajouter, ex. aspirateur, lampe', emptyIc: '🛋️', empty: 'Électroménager, meubles, déco… Note ici ce qu’il faut acheter pour la maison.',
    cart: 'Acheté', cartIc: '✅', all: 'Tout est acheté', count: (n) => (n ? `${n} à acheter` : 'Rien en vue') },
}
const LIST_KEY = 'toh-list'
const readList = (): List => { try { return localStorage.getItem(LIST_KEY) === 'achats' ? 'achats' : 'courses' } catch { return 'courses' } }

/** « 2 avocats » → quantité 2, nom « avocats » */
function split(title: string) {
  const m = title.match(/^\s*(\d+)\s*(?:x\s*)?(.+)$/i)
  return m ? { qty: m[1], name: m[2] } : { qty: '', name: title }
}

// historique des achats sur ce téléphone, pour proposer les habitués
type Hist = Record<string, { t: string; n: number }>
const histKey = (l: List) => (l === 'achats' ? 'toh-achats-hist' : 'toh-courses-hist')
const readHist = (l: List): Hist => { try { return JSON.parse(localStorage.getItem(histKey(l)) || '{}') } catch { return {} } }
const bump = (l: List, title: string) => {
  const h = readHist(l)
  const k = norm(split(title).name)
  if (!k) return
  h[k] = { t: split(title).name, n: (h[k]?.n ?? 0) + 1 }
  try { localStorage.setItem(histKey(l), JSON.stringify(h)) } catch {}
}

export function Courses({ store, toast }: { store: Store; toast: (m: string, undo?: () => void) => void }) {
  const { state, upsert, patch, remove } = store
  const [list, setListState] = useState<List>(readList)
  const setList = (l: List) => { setListState(l); try { localStorage.setItem(LIST_KEY, l) } catch {} }
  const T = TEXT[list]
  const all = state.items.filter((i) => i.cat === list)
  const other = state.items.filter((i) => i.cat === (list === 'courses' ? 'achats' : 'courses') && !i.done).length
  // article dont on change le rayon (appui long)
  const [moving, setMoving] = useState<Item | null>(null)
  const todo = all.filter((i) => !i.done).sort((a, b) => b.createdAt - a.createdAt)
  const cart = all.filter((i) => i.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  const [text, setText] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  // articles en train d'être cochés : ils restent à leur place le temps de l'animation
  const [ticking, setTicking] = useState<Set<string>>(new Set())
  const input = useRef<HTMLInputElement>(null)

  const groups = useMemo(() => {
    const by = new Map<string, Item[]>()
    for (const i of todo) {
      const a = i.aisle ?? aisleOf(i.title, list)
      by.set(a, [...(by.get(a) ?? []), i])
    }
    return [...aislesFor(list), OTHER].filter((a) => by.has(a.id)).map((a) => ({ ...a, items: by.get(a.id)! }))
  }, [todo, list])

  const onList = new Set(todo.map((i) => norm(split(i.title).name)))
  const hist = Object.values(readHist(list)).sort((a, b) => b.n - a.n).map((h) => h.t)
  const chips = [...new Set([...hist, ...DEFAULTS[list]])].filter((t) => !onList.has(norm(t))).slice(0, 8)

  const add = (raw: string) => {
    const title = raw.trim().replace(/^./, (c) => c.toUpperCase())
    if (!title) return
    const same = all.find((i) => norm(i.title) === norm(title))
    if (same && !same.done) { setFresh(same.id); toast('Déjà sur la liste'); return }
    if (same) { patch(same.id, { done: false, doneAt: undefined, createdAt: Date.now() }); setFresh(same.id); return }
    const known = learnedAisle(list, title)
    const it: Item = { id: newId(), title, cat: list, by: state.me, createdAt: Date.now(), ...(known ? { aisle: known } : {}) }
    upsert(it)
    setFresh(it.id)
  }
  useEffect(() => { if (!fresh) return; const t = setTimeout(() => setFresh(null), 900); return () => clearTimeout(t) }, [fresh])

  const tick = (i: Item, el: HTMLElement) => {
    navigator.vibrate?.(15)
    burst(el, 6)
    setTicking((s) => new Set(s).add(i.id))
    bump(list, i.title)
    const last = todo.length === 1
    setTimeout(() => {
      patch(i.id, { done: true, doneAt: Date.now() })
      setTicking((s) => { const n = new Set(s); n.delete(i.id); return n })
      if (last) { burst(document.querySelector('.courses-head') ?? el, 22); toast(T.all + ' !') }
    }, 650)
  }
  const drop = (i: Item) => { remove(i.id); toast(`${split(i.title).name} retiré`, () => upsert(i)) }
  const move = (i: Item, aisle: string) => {
    patch(i.id, { aisle })
    learn(list, i.title, aisle)
    setMoving(null)
    const a = [...aislesFor(list), OTHER].find((x) => x.id === aisle)
    toast(`Rangé dans ${a?.label ?? 'Autre'}`)
  }
  const empty = () => {
    const before = cart
    before.forEach((i) => remove(i.id))
    toast(before.length > 1 ? `${before.length} articles rangés` : 'Article rangé', () => before.forEach(upsert))
  }

  return (
    <div className="courses">
      <div className="courses-head">
        <h2 className="sheet-title">{T.title}</h2>
        <span className="courses-count" key={list + todo.length}>{T.count(todo.length)}</span>
      </div>
      <div className={'seg lists' + (list === 'achats' ? ' right' : '')}>
        <span className="knob" />
        <button aria-pressed={list === 'courses'} onClick={() => setList('courses')}>🛒 Courses{list !== 'courses' && other ? <i>{other}</i> : null}</button>
        <button aria-pressed={list === 'achats'} onClick={() => setList('achats')}>🛋️ Achats{list !== 'achats' && other ? <i>{other}</i> : null}</button>
      </div>

      <form className="courses-add" onSubmit={(e) => { e.preventDefault(); add(text); setText(''); input.current?.focus() }}>
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={T.ph} enterKeyHint="done"
          autoCapitalize="sentences" aria-label="Ajouter un article" />
        <button type="submit" className={'courses-plus' + (text.trim() ? ' on' : '')} aria-label="Ajouter">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </form>

      {!!chips.length && (
        <div className="courses-chips" aria-label="Ajouts rapides">
          {chips.map((t) => (
            <button key={t} className="courses-chip" onClick={(e) => { e.currentTarget.classList.add('gone'); add(t) }}>+ {t}</button>
          ))}
        </div>
      )}

      {!todo.length && !cart.length && (
        <div className="courses-empty">
          <span aria-hidden="true">{T.emptyIc}</span>
          <p>{T.empty}</p>
        </div>
      )}
      {!todo.length && !!cart.length && <p className="courses-done">{T.all} 🎉</p>}

      <div className="list-body" key={list}>
      {groups.map((g) => (
        <section key={g.id} className="aisle">
          <h3><span aria-hidden="true">{g.emoji}</span>{g.label}</h3>
          <ul>
            {g.items.map((i) => (
              <Row key={i.id} item={i} who={state.names[i.by]} fresh={fresh === i.id} ticking={ticking.has(i.id)}
                onTick={(el) => tick(i, el)} onDrop={() => drop(i)} onLong={() => setMoving(i)} />
            ))}
          </ul>
        </section>
      ))}

      {!!cart.length && (
        <section className="aisle cart">
          <div className="cart-head">
            <h3><span aria-hidden="true">{T.cartIc}</span>{T.cart} · {cart.length}</h3>
            <button className="cart-empty" onClick={empty}>Vider</button>
          </div>
          <ul>
            {cart.map((i) => (
              <Row key={i.id} item={i} who={state.names[i.by]} done onTick={() => patch(i.id, { done: false, doneAt: undefined })} onDrop={() => drop(i)} />
            ))}
          </ul>
        </section>
      )}
      </div>
      {(!!todo.length || !!cart.length) && <p className="hint courses-tip">Touche pour cocher · glisse à gauche pour retirer · appui long pour changer de rayon</p>}

      {moving && createPortal(
        <div className="mover" role="dialog" aria-label="Changer de rayon">
          <div className="mover-scrim" onClick={() => setMoving(null)} />
          <div className="mover-card">
            <p className="mover-title">Ranger <b>{split(moving.title).name}</b> dans…</p>
            <div className="mover-grid">
              {[...aislesFor(list), OTHER].map((a) => {
                const cur = (moving.aisle ?? aisleOf(moving.title, list)) === a.id
                return (
                  <button key={a.id} className={'mover-opt' + (cur ? ' on' : '')} onClick={() => move(moving, a.id)}>
                    <span aria-hidden="true">{a.emoji}</span>{a.label}
                  </button>
                )
              })}
            </div>
            <button className="mover-cancel" onClick={() => setMoving(null)}>Annuler</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/** Une ligne : toucher coche, glisser vers la gauche retire. */
function Row({ item, who, done, fresh, ticking, onTick, onDrop, onLong }: {
  item: Item; who: string; done?: boolean; fresh?: boolean; ticking?: boolean; onTick: (el: HTMLElement) => void; onDrop: () => void; onLong?: () => void
}) {
  const long = useRef(onLong)
  long.current = onLong
  // un appui long ne doit pas aussi cocher l'article
  const fired = useRef(false)
  const ref = useRef<HTMLLIElement>(null)
  const [gone, setGone] = useState(false)
  const drop = useRef(onDrop)
  drop.current = onDrop
  const { qty, name } = split(item.title)

  useEffect(() => {
    const li = ref.current!
    const body = li.querySelector<HTMLElement>('.row-body')!
    let x0 = 0, y0 = 0, dx = 0, mode: 'x' | 'y' | null = null, timer = 0
    const start = (e: TouchEvent) => {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; mode = null; body.style.transition = 'none'
      fired.current = false
      if (long.current) {
        li.classList.add('press')
        timer = window.setTimeout(() => { fired.current = true; li.classList.remove('press'); navigator.vibrate?.(20); long.current?.() }, 480)
      }
    }
    const move = (e: TouchEvent) => {
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0
      if (!mode && Math.abs(mx) + Math.abs(my) > 8) { mode = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'; clearTimeout(timer); li.classList.remove('press') }
      if (mode !== 'x') return
      // le glissement horizontal ne doit pas faire descendre la feuille
      e.stopPropagation()
      e.preventDefault()
      dx = Math.min(0, mx)
      body.style.transform = `translateX(${dx}px)`
      li.classList.add('swipe')
      li.classList.toggle('arm', dx < -90)
    }
    const end = () => {
      clearTimeout(timer)
      li.classList.remove('press')
      body.style.transition = ''
      if (mode === 'x' && dx < -90) {
        body.style.transform = 'translateX(-110%)'
        setGone(true)
        setTimeout(() => drop.current(), 260)
      } else body.style.transform = ''
      li.classList.remove('arm', 'swipe')
    }
    li.addEventListener('touchstart', start, { passive: true })
    li.addEventListener('touchmove', move, { passive: false })
    // clic droit sur ordinateur = appui long
    const ctx = (e: MouseEvent) => { if (long.current) { e.preventDefault(); long.current() } }
    li.addEventListener('touchend', end)
    li.addEventListener('touchcancel', end)
    li.addEventListener('contextmenu', ctx)
    return () => {
      clearTimeout(timer)
      li.removeEventListener('touchstart', start); li.removeEventListener('touchmove', move); li.removeEventListener('touchend', end)
      li.removeEventListener('touchcancel', end); li.removeEventListener('contextmenu', ctx)
    }
  }, [])

  return (
    <li ref={ref} className={'buy' + (done || ticking ? ' checked' : '') + (fresh ? ' fresh' : '') + (gone ? ' gone' : '')}>
      <span className="row-bin" aria-hidden="true">Retirer</span>
      <button className="row-body" onClick={(e) => { if (fired.current) { fired.current = false; return } if (!ticking) onTick(e.currentTarget.querySelector('.box') as HTMLElement) }}
        aria-pressed={!!done || !!ticking} aria-label={(done ? 'Remettre ' : 'Cocher ') + item.title}>
        <span className="box" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        {qty && <span className="qty">{qty}</span>}
        <span className="name-wrap"><span className="name">{name}</span>{item.note && <small className="for">pour {item.note}</small>}</span>
        <span className="who" title={`Ajouté par ${who}`}>{who.slice(0, 1)}</span>
      </button>
    </li>
  )
}
