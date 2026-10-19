import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CatIcon, cat, Heart, HEART_PATH } from '../cats'
import { avg } from '../store'
import type { AppState, Item } from '../types'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Feuille qui monte du bas ; on la referme en la tirant vers le bas. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; t: number; dy: number; on: boolean } | null>(null)

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const start = (e: TouchEvent) => {
      drag.current = { y: e.touches[0].clientY, t: performance.now(), dy: 0, on: false }
    }
    const move = (e: TouchEvent) => {
      const d = drag.current
      if (!d) return
      const dy = e.touches[0].clientY - d.y
      if (!d.on && dy > 6 && el.scrollTop <= 0) d.on = true
      if (!d.on) return
      e.preventDefault()
      d.dy = Math.max(0, dy)
      el.style.transition = 'none'
      el.style.transform = `translateY(${d.dy}px)`
      document.documentElement.style.setProperty('--sheet-pull', String(Math.min(d.dy / 400, 1)))
    }
    const end = () => {
      const d = drag.current
      drag.current = null
      el.style.transition = ''
      el.style.transform = ''
      document.documentElement.style.setProperty('--sheet-pull', '0')
      if (!d?.on) return
      const v = d.dy / (performance.now() - d.t)
      if (d.dy > 130 || v > 0.6) onClose()
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [onClose])

  useEffect(() => {
    document.documentElement.classList.toggle('sheet-open', open)
    if (open && ref.current) ref.current.scrollTop = 0
  }, [open])

  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={onClose} />
      <div ref={ref} className={'sheet' + (open ? ' on' : '')} role="dialog" aria-modal="true" aria-hidden={!open}>
        <button className="grab" onClick={onClose} aria-label="Fermer" tabIndex={-1} />
        <button className="sheet-x" onClick={onClose} aria-label="Fermer">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {open && <div className="stagger">{children}</div>}
      </div>
    </>
  )
}

export function Hearts({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="hrow" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n + '-' + (n <= value ? 'on' : 'off')} role="radio" aria-checked={n === value} className={n <= value ? 'on' : ''}
          style={{ animationDelay: `${(n - 1) * 45}ms` }}
          aria-label={`${n} cœur${n > 1 ? 's' : ''}`}
          onClick={(e) => { onChange(n); burst(e.currentTarget, n === 5 ? 16 : 5) }}>
          <Heart size={28} />
        </button>
      ))}
    </div>
  )
}

/** Carte d'idée ; on la glisse vers la droite pour dire « c'est fait ». */
export function ItemCard({ item, state, onOpen, onCheck, index = 0 }: {
  item: Item; state: AppState; onOpen: () => void; onCheck?: (el: HTMLElement) => void; index?: number
}) {
  const c = cat(item.cat)
  const a = avg(item)
  const card = useRef<HTMLDivElement>(null)
  const checkBtn = useRef<HTMLButtonElement>(null)
  const g = useRef<{ x: number; y: number; dx: number; lock?: 'x' | 'y' } | null>(null)
  const [gone, setGone] = useState(false)
  const swipeable = !!onCheck && !item.done

  const finish = () => {
    setGone(true)
    setTimeout(() => onCheck?.(checkBtn.current ?? card.current!), 230)
  }

  useEffect(() => {
    const el = card.current
    if (!el || !swipeable) return
    const start = (e: TouchEvent) => { g.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0 } }
    const move = (e: TouchEvent) => {
      const s = g.current
      if (!s) return
      const dx = e.touches[0].clientX - s.x
      const dy = e.touches[0].clientY - s.y
      if (!s.lock && Math.abs(dx) + Math.abs(dy) > 8) s.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (s.lock !== 'x') return
      e.preventDefault()
      s.dx = Math.max(0, dx)
      const p = Math.min(s.dx / 110, 1)
      el.style.transition = 'none'
      el.style.transform = `translateX(${s.dx}px) rotate(${p * 2}deg)`
      el.parentElement?.style.setProperty('--p', String(p))
    }
    const end = () => {
      const s = g.current
      g.current = null
      el.style.transition = ''
      el.style.transform = ''
      el.parentElement?.style.setProperty('--p', '0')
      if (s?.lock === 'x' && s.dx > 110) finish()
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipeable])

  return (
    <div className={'swipe' + (gone ? ' gone' : '')} style={{ animationDelay: `${index * 55}ms` }}>
      {swipeable && (
        <span className="swipe-bg" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          C'est fait
        </span>
      )}
      <div ref={card} className="card" style={{ background: c.bg, color: c.ink, ['--cb' as string]: c.bg, ['--ci' as string]: c.ink }}>
        <button className="card-main" onClick={onOpen}>
          <span className="bubble">
            {item.poster ? <img src={item.poster} alt="" loading="lazy" /> : <CatIcon id={item.cat} />}
          </span>
          <span className="card-txt">
            <span className="card-title">{item.title}</span>
            <span className="card-sub">
              {item.where || c.label}
              {item.done ? (item.doneAt ? <> · fait le {shortDate(item.doneAt)}</> : null) : <> · par {state.names[item.by]}</>}
            </span>
          </span>
        </button>
        {item.done ? (
          a ? (
            <span className="card-score" aria-label={`Moyenne ${a.toFixed(1)} sur 5`}>
              <Heart size={14} /> {a.toFixed(1)}
            </span>
          ) : <span className="card-score todo-rate">À noter</span>
        ) : onCheck ? (
          <button ref={checkBtn} className="check" aria-label="C'est fait" onClick={finish}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </button>
        ) : null}
      </div>
    </div>
  )
}

export const shortDate = (t: number) =>
  new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(new Date(t).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })

/** Nombre qui défile jusqu'à sa valeur. */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(reduced() ? value : 0)
  const from = useRef(0)
  useEffect(() => {
    if (reduced()) { setShown(value); return }
    const a = from.current
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min((t - t0) / 700, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setShown(a + (value - a) * e)
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown.toFixed(decimals)}</>
}

/** Vue défilante avec grand titre qui se replie en barre compacte ; avec `onRefresh`, on tire vers le bas pour rafraîchir. */
export function ScrollView({ hidden, title, dx, onRefresh, children }: { hidden: boolean; title: string; dx: number; onRefresh?: () => Promise<void> | void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  const [pull, setPull] = useState(0)
  const [loading, setLoading] = useState(false)
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = el.scrollTop
        el.style.setProperty('--sy', String(Math.min(y, 400)))
        setCompact(y > 70)
      })
    }
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el || !onRefresh) return
    const TRIGGER = 80
    let y0: number | null = null
    let d = 0
    let busy = false
    const start = (e: TouchEvent) => { y0 = !busy && el.scrollTop <= 0 ? e.touches[0].clientY : null; d = 0 }
    const move = (e: TouchEvent) => {
      if (y0 == null) return
      const dy = e.touches[0].clientY - y0
      if (dy <= 0) { if (d) { d = 0; setPull(0) } return }
      e.preventDefault()
      d = Math.min(dy * 0.5, 120)
      setPull(d)
    }
    const end = async () => {
      if (y0 == null) return
      y0 = null
      if (d < TRIGGER) { setPull(0); return }
      busy = true
      setLoading(true); setPull(64)
      navigator.vibrate?.(10)
      try { await Promise.all([refreshRef.current?.(), new Promise((r) => setTimeout(r, 900))]) } finally {
        busy = false
        setLoading(false); setPull(0)
      }
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [!!onRefresh])
  return (
    <section ref={ref} className="view" hidden={hidden} style={{ ['--dx' as string]: `${dx}px` }}>
      <div className={'minibar' + (compact ? ' on' : '')} aria-hidden={!compact}>{title}</div>
      {onRefresh && (
        <div className={'ptr' + (loading ? ' loading' : '') + (pull >= 80 ? ' ready' : '')} style={{ opacity: Math.min(1, pull / 60), transform: `translateY(${pull * 0.45}px) rotate(${pull * 3}deg)` }} aria-hidden={!loading}>
          <Heart size={22} />
        </div>
      )}
      <div ref={inner} className={'ptr-body' + (pull ? ' pulling' : '')} style={pull ? { transform: `translateY(${pull}px)` } : undefined}>
        {children}
      </div>
    </section>
  )
}

/** Petit écran d'accueil : trois cœurs qui se posent. */
export function Splash({ onEnd }: { onEnd: () => void }) {
  useEffect(() => { const t = setTimeout(onEnd, reduced() ? 0 : 1250); return () => clearTimeout(t) }, [onEnd])
  return (
    <div className="splash" aria-hidden="true">
      <svg viewBox="0 0 60 60" width="120" height="120">
        <path className="s1" d="M15 40c-7-5-11-9-11-14a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 5-4 9-11 14z" style={{ fill: 'var(--s1)' }} />
        <path className="s2" d="M45 40c-7-5-11-9-11-14a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 5-4 9-11 14z" style={{ fill: 'var(--s2)' }} />
        <path className="s3" d="M30 48c-9-6.5-14-11-14-17.5a7.5 7.5 0 0 1 14-4 7.5 7.5 0 0 1 14 4C44 37 39 41.5 30 48z" style={{ fill: 'var(--s3)' }} />
      </svg>
      <span>Three of Heart</span>
    </div>
  )
}

export function burst(el: Element, count = 16) {
  if (reduced()) return
  const r = el.getBoundingClientRect()
  const w = document.createElement('div')
  w.className = 'burst'
  w.style.left = `${r.left + r.width / 2 - 11}px`
  w.style.top = `${r.top + r.height / 2 - 11}px`
  const cols = document.documentElement.dataset.design === 'v2'
    ? ['#DE3566', '#FCCC60', '#FF9BAE', '#72BA2C', '#FA610E']
    : ['#C8F135', '#EF8E01', '#FFD43B', '#FFFFFF', '#8FB4FF']
  const spread = count > 8 ? 1 : 0.45
  for (let k = 0; k < count; k++) {
    const a = Math.random() * Math.PI * 2
    const d = (60 + Math.random() * 100) * spread
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    s.setAttribute('viewBox', '0 0 24 24')
    s.innerHTML = `<path d="${HEART_PATH}" fill="${cols[k % cols.length]}"/>`
    s.style.setProperty('--x', `${Math.cos(a) * d}px`)
    s.style.setProperty('--y', `${Math.sin(a) * d - 50 * spread}px`)
    s.style.setProperty('--r', `${Math.random() * 90 - 45}deg`)
    s.style.animationDelay = `${Math.random() * 90}ms`
    if (count <= 8) s.style.width = s.style.height = '14px'
    w.appendChild(s)
  }
  document.body.appendChild(w)
  setTimeout(() => w.remove(), 1300)
  navigator.vibrate?.(12)
}
