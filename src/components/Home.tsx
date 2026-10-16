import { CATS, CatIcon, Heart } from '../cats'
import type { Store } from '../store'
import type { CatId } from '../types'
import { ItemCard } from './ui'

const today = () => {
  const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function Home({ store, onOpen, onCheck, onCat, onRandom, onYesNo }: {
  store: Store
  onOpen: (id: string) => void
  onCheck: (id: string, el: HTMLElement) => void
  onCat: (c: CatId) => void
  onRandom: () => void
  onYesNo: () => void
}) {
  const { state } = store
  const todo = state.items.filter((i) => !i.done)
  const latest = [...todo].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
  const count = (c: CatId) => todo.filter((i) => i.cat === c).length

  return (
    <div className="page">
      <div className="topline">
        <div className="duo-mini" aria-hidden="true">
          <span className="av a">{state.names.a[0]}</span>
          <span className="av b">{state.names.b[0]}</span>
        </div>
        <div className="date">{today()}</div>
      </div>
      <h1 className="big">Salut {state.names.a}<br />& {state.names.b}</h1>

      <section className="hero">
        <div className="hero-txt">
          <h2>Ce soir, on fait quoi ?</h2>
          <p>{todo.length} idées en attente</p>
          <div className="hero-btns">
            <button className="pill-btn" onClick={onRandom}>Tirer au sort</button>
            <button className="pill-btn light" onClick={onYesNo}>Oui ou non ?</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <Heart size={70} className="h1" />
          <Heart size={56} className="h2" />
          <Heart size={44} className="h3" />
        </div>
      </section>

      <div className="section-head"><h2>Nos envies</h2></div>
      <div className="bento">
        {CATS.map((c, k) => (
          <button key={c.id} className={'tile' + (k === 0 ? ' tall' : k === CATS.length - 1 ? ' wide' : '')} style={{ background: c.bg, animationDelay: `${k * 40}ms` }}
            onClick={() => onCat(c.id)}>
            <span className="tag">{count(c.id)} à faire</span>
            <span className="tile-ic"><CatIcon id={c.id} size={k === 0 ? 30 : 22} /></span>
            <span className="tile-name">{c.plural}</span>
          </button>
        ))}
      </div>

      <div className="section-head"><h2>Dernières idées</h2></div>
      <div className="stack">
        {latest.map((i, k) => (
          <ItemCard key={i.id} item={i} state={state} index={k} onOpen={() => onOpen(i.id)} onCheck={(el) => onCheck(i.id, el)} />
        ))}
        {!latest.length && <p className="empty">Rien en attente. Ajoute une idée avec le bouton +.</p>}
      </div>
    </div>
  )
}
