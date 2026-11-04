import { CATS, CatIcon, COURSES } from '../cats'
import { isIdea, type Store } from '../store'
import type { CatId } from '../types'
import { CountUp, ItemCard } from './ui'

export function Home({ store, onOpen, onCheck, onCat, onYesNo, onCourses }: {
  store: Store
  onOpen: (id: string) => void
  onCheck: (id: string, el: HTMLElement) => void
  onCat: (c: CatId) => void
  onYesNo: () => void
  onCourses: () => void
}) {
  const { state } = store
  const todo = state.items.filter((i) => isIdea(i) && !i.done)
  const latest = [...todo].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
  const buy = state.items.filter((i) => i.cat === 'courses' && !i.done).sort((a, b) => b.createdAt - a.createdAt)
  const count = (c: CatId) => todo.filter((i) => i.cat === c).length

  return (
    <div className="page">
      <header className="brand-row">
        <h1 className="big brand-title">Threeofheart</h1>
        <button className="yn-coin" onClick={onYesNo} aria-label="Oui ou non ?">
          <span className="yn-face"><b>Oui</b><i>ou</i><b>Non</b></span>
        </button>
      </header>

      <button className="shop-card" onClick={onCourses}>
        <span className="shop-ic"><CatIcon id={COURSES.id} size={24} /></span>
        <span className="shop-txt">
          <b>Courses</b>
          <span>{buy.length ? buy.slice(0, 3).map((i) => i.title).join(', ') + (buy.length > 3 ? '…' : '') : 'Rien à acheter pour l’instant'}</span>
        </span>
        <span className="shop-n" key={buy.length}>{buy.length || '+'}</span>
      </button>

      <div className="section-head"><h2>Nos envies</h2></div>
      <div className="bento">
        {CATS.map((c, k) => (
          <button key={c.id} className={'tile' + (k === 0 ? ' tall' : k === CATS.length - 1 ? ' wide' : '')} style={{ background: c.bg, color: c.ink, animationDelay: `${k * 40}ms` }}
            onClick={() => onCat(c.id)}>
            <span className="tag"><CountUp value={count(c.id)} /> à faire</span>
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
