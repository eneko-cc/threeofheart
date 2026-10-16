import { useState } from 'react'
import { CATS } from '../cats'
import { avg, type Store } from '../store'
import type { CatId } from '../types'
import { ItemCard } from './ui'

export function Chips({ value, onChange, only }: { value: CatId | 'all'; onChange: (v: CatId | 'all') => void; only?: CatId[] }) {
  const list = only ? CATS.filter((c) => only.includes(c.id)) : CATS
  return (
    <div className="chips">
      <button className="chip" aria-pressed={value === 'all'} onClick={() => onChange('all')}>Tout</button>
      {list.map((c) => (
        <button key={c.id} className="chip" aria-pressed={value === c.id} onClick={() => onChange(c.id)}>
          <span className="dot" style={{ background: c.pin }} />{c.plural}
        </button>
      ))}
    </div>
  )
}

export function ListView({ store, filter, setFilter, onOpen, onCheck }: {
  store: Store
  filter: CatId | 'all'
  setFilter: (f: CatId | 'all') => void
  onOpen: (id: string) => void
  onCheck: (id: string, el: HTMLElement) => void
}) {
  const { state } = store
  const [tab, setTab] = useState<'todo' | 'done'>('todo')
  const [q, setQ] = useState('')
  const items = state.items
    .filter((i) => !!i.done === (tab === 'done'))
    .filter((i) => filter === 'all' || i.cat === filter)
    .filter((i) => !q || (i.title + ' ' + (i.where ?? '')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (tab === 'done' ? avg(b) - avg(a) : b.createdAt - a.createdAt))

  return (
    <div className="page">
      <h1 className="big small">Notre liste</h1>
      <input className="search" type="search" id="list-search" placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className={'seg' + (tab === 'done' ? ' right' : '')}>
        <span className="knob" />
        <button aria-pressed={tab === 'todo'} onClick={() => setTab('todo')}>À faire</button>
        <button aria-pressed={tab === 'done'} onClick={() => setTab('done')}>C'est fait</button>
      </div>
      <Chips value={filter} onChange={setFilter} />
      <div className="list" key={tab + filter}>
        {items.map((i, k) => (
          <ItemCard key={i.id} item={i} state={state} index={k} onOpen={() => onOpen(i.id)} onCheck={(el) => onCheck(i.id, el)} />
        ))}
        {!items.length && (
          <p className="empty">
            {tab === 'done' ? 'Rien de terminé ici pour l’instant.' : 'Rien ici. Ajoute une idée avec le bouton +.'}
          </p>
        )}
      </div>
    </div>
  )
}
