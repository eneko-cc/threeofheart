import { useEffect, useRef, useState } from 'react'
import { burst } from './ui'

// Roue de la décision : douze parts, Oui et Non en alternance. On tape, elle tourne, elle tranche.
const N = 12
const SLICE = 360 / N
const TURN_MS = 4200

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`
}
const slicePath = (k: number) => `M0 0L${pt(k * SLICE, 100)}A100 100 0 0 1 ${pt((k + 1) * SLICE, 100)}Z`

export function YesNo({ question }: { question?: string }) {
  const [angle, setAngle] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'spin' | 'yes' | 'no'>('idle')
  const wheel = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const raf = useRef(0)
  useEffect(() => () => { cancelAnimationFrame(raf.current); clearTimeout(timer.current) }, [])

  const spin = () => {
    if (phase === 'spin') return
    // on choisit la part gagnante, puis l'angle pour qu'elle s'arrête sous la flèche
    const k = Math.floor(Math.random() * N)
    const inside = SLICE * (0.15 + Math.random() * 0.7)
    const target = 360 - (k * SLICE + inside)
    const now = ((angle % 360) + 360) % 360
    const next = angle + (5 + Math.floor(Math.random() * 3)) * 360 + ((target - now + 360) % 360)
    // animation pilotée image par image : elle tourne même si l'iPhone a « Réduire les animations » activé
    const el = wheel.current
    const t0 = performance.now()
    cancelAnimationFrame(raf.current)
    const step = (t: number) => {
      const p = Math.min((t - t0) / TURN_MS, 1)
      const e = 1 - Math.pow(1 - p, 4)
      if (el) el.style.transform = `rotate(${angle + (next - angle) * e}deg)`
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    setAngle(next)
    setPhase('spin')
    navigator.vibrate?.(8)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const yes = k % 2 === 0
      setPhase(yes ? 'yes' : 'no')
      navigator.vibrate?.(yes ? [12, 60, 12] : 20)
      if (yes && wheel.current) burst(wheel.current)
    }, TURN_MS)
  }

  const done = phase === 'yes' || phase === 'no'

  return (
    <div className="yesno">
      <h2 className="sheet-title">Oui ou non ?</h2>
      {question && <p className="yn-q">{question}</p>}
      <div className="wheel-wrap">
        <span className="wheel-arrow" aria-hidden="true" />
        <div ref={wheel} className="wheel" style={phase === 'spin' ? undefined : { transform: `rotate(${angle}deg)` }}
          onClick={spin} role="button" aria-label="Faire tourner la roue">
          <svg viewBox="-100 -100 200 200" aria-hidden="true">
            {Array.from({ length: N }, (_, k) => (
              <g key={k} className={k % 2 === 0 ? 'w-yes' : 'w-no'} data-alt={k % 4 < 2 ? 'a' : 'b'}>
                <path d={slicePath(k)} />
                <text transform={`rotate(${k * SLICE + SLICE / 2}) translate(0 -66) rotate(90)`} textAnchor="middle" dominantBaseline="central">
                  {k % 2 === 0 ? 'Oui' : 'Non'}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <button className="wheel-hub" onClick={spin} disabled={phase === 'spin'} aria-label="Faire tourner la roue">
          {phase === 'spin' ? '…' : 'Go'}
        </button>
      </div>
      <p className={'yn-res' + (done ? ' on ' + phase : '')} aria-live="polite">
        {phase === 'yes' ? 'Oui !' : phase === 'no' ? 'Non' : ' '}
      </p>
      <button className="primary" onClick={spin} disabled={phase === 'spin'}>
        {phase === 'idle' ? 'Faire tourner' : phase === 'spin' ? 'Ça tourne…' : 'On relance'}
      </button>
    </div>
  )
}
