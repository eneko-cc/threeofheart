import { useEffect, type ReactNode } from 'react'
import { CatIcon, cat, Heart, HEART_PATH } from '../cats'
import { avg } from '../store'
import type { AppState, Item } from '../types'

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={onClose} />
      <div className={'sheet' + (open ? ' on' : '')} role="dialog" aria-modal="true" aria-hidden={!open}>
        <button className="grab" onClick={onClose} aria-label="Fermer" />
        {open && children}
      </div>
    </>
  )
}

export function Hearts({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="hrow" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} role="radio" aria-checked={n === value} className={n <= value ? 'on' : ''}
          style={{ transitionDelay: n <= value ? `${n * 40}ms` : '0ms' }}
          aria-label={`${n} cœur${n > 1 ? 's' : ''}`}
          onClick={(e) => { onChange(n); if (n === 5) burst(e.currentTarget) }}>
          <Heart size={28} />
        </button>
      ))}
    </div>
  )
}

export function ItemCard({ item, state, onOpen, onCheck, index = 0 }: {
  item: Item; state: AppState; onOpen: () => void; onCheck?: (el: HTMLElement) => void; index?: number
}) {
  const c = cat(item.cat)
  const a = avg(item)
  return (
    <div className="card" style={{ background: c.bg, animationDelay: `${index * 50}ms` }}>
      <button className="card-main" onClick={onOpen}>
        <span className="bubble">
          {item.poster ? <img src={item.poster} alt="" /> : <CatIcon id={item.cat} />}
        </span>
        <span className="card-txt">
          <span className="card-title">{item.title}</span>
          <span className="card-sub">
            {item.where || c.label}
            {item.done ? null : <> · par {state.names[item.by]}</>}
          </span>
        </span>
      </button>
      {item.done ? (
        <span className="card-score" aria-label={`Moyenne ${a.toFixed(1)} sur 5`}>
          <Heart size={14} /> {a ? a.toFixed(1) : '–'}
        </span>
      ) : onCheck ? (
        <button className="check" aria-label="C'est fait" onClick={(e) => onCheck(e.currentTarget)} />
      ) : null}
    </div>
  )
}

export function burst(el: Element) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const r = el.getBoundingClientRect()
  const w = document.createElement('div')
  w.className = 'burst'
  w.style.left = `${r.left + r.width / 2 - 11}px`
  w.style.top = `${r.top + r.height / 2 - 11}px`
  const cols = ['#E58AA5', '#6FA3CF', '#F4B6C8', '#6DB58A', '#1F4D3A']
  for (let k = 0; k < 16; k++) {
    const a = Math.random() * Math.PI * 2
    const d = 60 + Math.random() * 100
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    s.setAttribute('viewBox', '0 0 24 24')
    s.innerHTML = `<path d="${HEART_PATH}" fill="${cols[k % cols.length]}"/>`
    s.style.setProperty('--x', `${Math.cos(a) * d}px`)
    s.style.setProperty('--y', `${Math.sin(a) * d - 50}px`)
    s.style.setProperty('--r', `${Math.random() * 90 - 45}deg`)
    s.style.animationDelay = `${Math.random() * 90}ms`
    w.appendChild(s)
  }
  document.body.appendChild(w)
  setTimeout(() => w.remove(), 1300)
  navigator.vibrate?.(12)
}
