import { useEffect, useMemo, useRef, useState } from 'react'
import { newId, type Store } from '../store'
import type { Item } from '../types'
import { burst } from './ui'

/** Rayons, dans l'ordre d'un passage en magasin. Les mots sont comparés au début de chaque mot saisi, sans accents. */
const AISLES: { id: string; label: string; emoji: string; words: string[] }[] = [
  { id: 'fl', label: 'Fruits et légumes', emoji: '🥦', words: ['fruit', 'legume', 'pomme', 'banane', 'poire', 'orange', 'citron', 'clementine', 'kiwi', 'fraise', 'framboise', 'raisin', 'mangue', 'ananas', 'avocat', 'tomate', 'salade', 'laitue', 'carotte', 'oignon', 'echalote', 'ail', 'courgette', 'poivron', 'champignon', 'patate', 'concombre', 'epinard', 'brocoli', 'chou', 'aubergine', 'poireau', 'basilic', 'persil', 'coriandre', 'menthe', 'radis', 'betterave', 'courge', 'potiron'] },
  { id: 'pain', label: 'Boulangerie', emoji: '🥖', words: ['pain', 'baguette', 'croissant', 'brioche', 'viennoiserie', 'pita', 'wrap', 'tortilla'] },
  { id: 'frais', label: 'Frais', emoji: '🧀', words: ['lait', 'yaourt', 'yogourt', 'skyr', 'fromage', 'beurre', 'creme', 'oeuf', 'œuf', 'jambon', 'emmental', 'mozza', 'parmesan', 'comte', 'feta', 'chevre', 'burrata', 'ricotta', 'houmous', 'tofu', 'pate feuillete', 'pate brisee'] },
  { id: 'viande', label: 'Viande et poisson', emoji: '🥩', words: ['poulet', 'boeuf', 'bœuf', 'steak', 'viande', 'hache', 'porc', 'agneau', 'dinde', 'lardon', 'saucisse', 'chorizo', 'poisson', 'saumon', 'thon', 'cabillaud', 'crevette', 'moule'] },
  { id: 'epicerie', label: 'Épicerie', emoji: '🍝', words: ['pate', 'pates', 'spaghetti', 'riz', 'farine', 'sucre', 'sel', 'poivre', 'huile', 'vinaigre', 'cafe', 'the', 'tisane', 'cereale', 'muesli', 'chocolat', 'biscuit', 'gateau', 'conserve', 'sauce', 'pesto', 'epice', 'miel', 'confiture', 'chips', 'lentille', 'pois chiche', 'haricot', 'moutarde', 'mayo', 'ketchup', 'bouillon', 'levure', 'noix', 'amande', 'quinoa', 'semoule', 'olive'] },
  { id: 'boissons', label: 'Boissons', emoji: '🧃', words: ['eau', 'jus', 'vin', 'biere', 'soda', 'coca', 'sirop', 'champagne', 'limonade', 'kombucha', 'lait d avoine'] },
  { id: 'surgeles', label: 'Surgelés', emoji: '🧊', words: ['surgele', 'glace', 'glacon', 'pizza', 'frite'] },
  { id: 'maison', label: 'Maison et hygiène', emoji: '🧴', words: ['papier', 'pq', 'sopalin', 'essuie', 'lessive', 'adoucissant', 'vaisselle', 'eponge', 'savon', 'shampoing', 'shampooing', 'apres shampoing', 'gel douche', 'dentifrice', 'brosse', 'coton', 'sac poubelle', 'poubelle', 'deodorant', 'mouchoir', 'produit', 'javel', 'ampoule', 'pile', 'rasoir', 'creme solaire', 'serviette'] },
]
const OTHER = { id: 'autre', label: 'Autre', emoji: '🛍️' }
const DEFAULTS = ['Lait', 'Pain', 'Œufs', 'Pâtes', 'Bananes', 'Café', 'Papier toilette', 'Lessive']

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9œ ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Rayon d'un article ; la quantité en tête (« 2 avocats ») est ignorée. Les expressions de plusieurs mots passent avant les mots seuls. */
function aisleOf(title: string) {
  const t = norm(title).replace(/^\d+\s*(x\s*)?/, '')
  const words = t.split(' ')
  let best: { id: string; len: number } | null = null
  for (const a of AISLES) {
    for (const w of a.words) {
      const nw = norm(w)
      const hit = nw.includes(' ') ? (' ' + t + ' ').includes(' ' + nw) : words.some((x) => x.startsWith(nw) && x.length <= nw.length + 2)
      if (hit && (!best || nw.length > best.len)) best = { id: a.id, len: nw.length }
    }
  }
  return best?.id ?? OTHER.id
}

/** « 2 avocats » → quantité 2, nom « avocats » */
function split(title: string) {
  const m = title.match(/^\s*(\d+)\s*(?:x\s*)?(.+)$/i)
  return m ? { qty: m[1], name: m[2] } : { qty: '', name: title }
}

// historique des achats sur ce téléphone, pour proposer les habitués
type Hist = Record<string, { t: string; n: number }>
const HIST_KEY = 'toh-courses-hist'
const readHist = (): Hist => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '{}') } catch { return {} } }
const bump = (title: string) => {
  const h = readHist()
  const k = norm(split(title).name)
  if (!k) return
  h[k] = { t: split(title).name, n: (h[k]?.n ?? 0) + 1 }
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h)) } catch {}
}

export function Courses({ store, toast }: { store: Store; toast: (m: string, undo?: () => void) => void }) {
  const { state, upsert, patch, remove } = store
  const all = state.items.filter((i) => i.cat === 'courses')
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
      const a = aisleOf(i.title)
      by.set(a, [...(by.get(a) ?? []), i])
    }
    return [...AISLES, OTHER].filter((a) => by.has(a.id)).map((a) => ({ ...a, items: by.get(a.id)! }))
  }, [todo])

  const onList = new Set(todo.map((i) => norm(split(i.title).name)))
  const hist = Object.values(readHist()).sort((a, b) => b.n - a.n).map((h) => h.t)
  const chips = [...new Set([...hist, ...DEFAULTS])].filter((t) => !onList.has(norm(t))).slice(0, 8)

  const add = (raw: string) => {
    const title = raw.trim().replace(/^./, (c) => c.toUpperCase())
    if (!title) return
    const same = all.find((i) => norm(i.title) === norm(title))
    if (same && !same.done) { setFresh(same.id); toast('Déjà sur la liste'); return }
    if (same) { patch(same.id, { done: false, doneAt: undefined, createdAt: Date.now() }); setFresh(same.id); return }
    const it: Item = { id: newId(), title, cat: 'courses', by: state.me, createdAt: Date.now() }
    upsert(it)
    setFresh(it.id)
  }
  useEffect(() => { if (!fresh) return; const t = setTimeout(() => setFresh(null), 900); return () => clearTimeout(t) }, [fresh])

  const tick = (i: Item, el: HTMLElement) => {
    navigator.vibrate?.(15)
    burst(el, 6)
    setTicking((s) => new Set(s).add(i.id))
    bump(i.title)
    const last = todo.length === 1
    setTimeout(() => {
      patch(i.id, { done: true, doneAt: Date.now() })
      setTicking((s) => { const n = new Set(s); n.delete(i.id); return n })
      if (last) { burst(document.querySelector('.courses-head') ?? el, 22); toast('Tout est dans le panier !') }
    }, 650)
  }
  const drop = (i: Item) => { remove(i.id); toast(`${split(i.title).name} retiré`, () => upsert(i)) }
  const empty = () => {
    const before = cart
    before.forEach((i) => remove(i.id))
    toast(before.length > 1 ? `${before.length} articles rangés` : 'Article rangé', () => before.forEach(upsert))
  }

  return (
    <div className="courses">
      <div className="courses-head">
        <h2 className="sheet-title">Courses</h2>
        <span className="courses-count" key={todo.length}>{todo.length ? `${todo.length} à acheter` : 'Rien à acheter'}</span>
      </div>

      <form className="courses-add" onSubmit={(e) => { e.preventDefault(); add(text); setText(''); input.current?.focus() }}>
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter, ex. 2 avocats" enterKeyHint="done"
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
          <span aria-hidden="true">🧺</span>
          <p>La liste est vide. Ajoute ce qui manque, l'autre le verra tout de suite.</p>
        </div>
      )}
      {!todo.length && !!cart.length && <p className="courses-done">Tout est dans le panier 🎉</p>}

      {groups.map((g) => (
        <section key={g.id} className="aisle">
          <h3><span aria-hidden="true">{g.emoji}</span>{g.label}</h3>
          <ul>
            {g.items.map((i) => (
              <Row key={i.id} item={i} who={state.names[i.by]} fresh={fresh === i.id} ticking={ticking.has(i.id)}
                onTick={(el) => tick(i, el)} onDrop={() => drop(i)} />
            ))}
          </ul>
        </section>
      ))}

      {!!cart.length && (
        <section className="aisle cart">
          <div className="cart-head">
            <h3><span aria-hidden="true">🛒</span>Dans le panier · {cart.length}</h3>
            <button className="cart-empty" onClick={empty}>Vider</button>
          </div>
          <ul>
            {cart.map((i) => (
              <Row key={i.id} item={i} who={state.names[i.by]} done onTick={() => patch(i.id, { done: false, doneAt: undefined })} onDrop={() => drop(i)} />
            ))}
          </ul>
        </section>
      )}
      {(!!todo.length || !!cart.length) && <p className="hint courses-tip">Touche pour cocher, glisse vers la gauche pour retirer.</p>}
    </div>
  )
}

/** Une ligne : toucher coche, glisser vers la gauche retire. */
function Row({ item, who, done, fresh, ticking, onTick, onDrop }: {
  item: Item; who: string; done?: boolean; fresh?: boolean; ticking?: boolean; onTick: (el: HTMLElement) => void; onDrop: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  const [gone, setGone] = useState(false)
  const drop = useRef(onDrop)
  drop.current = onDrop
  const { qty, name } = split(item.title)

  useEffect(() => {
    const li = ref.current!
    const body = li.querySelector<HTMLElement>('.row-body')!
    let x0 = 0, y0 = 0, dx = 0, mode: 'x' | 'y' | null = null
    const start = (e: TouchEvent) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; mode = null; body.style.transition = 'none' }
    const move = (e: TouchEvent) => {
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0
      if (!mode && Math.abs(mx) + Math.abs(my) > 8) mode = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
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
    li.addEventListener('touchend', end)
    return () => { li.removeEventListener('touchstart', start); li.removeEventListener('touchmove', move); li.removeEventListener('touchend', end) }
  }, [])

  return (
    <li ref={ref} className={'buy' + (done || ticking ? ' checked' : '') + (fresh ? ' fresh' : '') + (gone ? ' gone' : '')}>
      <span className="row-bin" aria-hidden="true">Retirer</span>
      <button className="row-body" onClick={(e) => { if (!ticking) onTick(e.currentTarget.querySelector('.box') as HTMLElement) }}
        aria-pressed={!!done || !!ticking} aria-label={(done ? 'Remettre ' : 'Cocher ') + item.title}>
        <span className="box" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        {qty && <span className="qty">{qty}</span>}
        <span className="name">{name}</span>
        <span className="who" title={`Ajouté par ${who}`}>{who.slice(0, 1)}</span>
      </button>
    </li>
  )
}
