import { useRef, useState } from 'react'
import { burst } from './ui'

const YES = ['Oui !']
const NO = ['Non']
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

export function YesNo({ question }: { question?: string }) {
  const [q, setQ] = useState(question ?? '')
  const [phase, setPhase] = useState<'idle' | 'spin' | 'yes' | 'no'>('idle')
  const [word, setWord] = useState('')
  const coin = useRef<HTMLButtonElement>(null)

  const ask = () => {
    if (phase === 'spin') return
    const yes = Math.random() < 0.5
    setPhase('spin')
    navigator.vibrate?.(8)
    setTimeout(() => {
      setWord(pick(yes ? YES : NO))
      setPhase(yes ? 'yes' : 'no')
      if (yes && coin.current) burst(coin.current)
    }, 1300)
  }

  return (
    <div className="yesno">
      <h2 className="sheet-title">Oui ou non ?</h2>
      <div className="field">
        <label htmlFor="yn-q">La question</label>
        <input id="yn-q" autoComplete="off" placeholder="Ex. on se fait un resto ce soir ?" value={q}
          onChange={(e) => { setQ(e.target.value); setPhase('idle') }} />
      </div>
      <div className="coin-wrap">
        <button ref={coin} className={'coin ' + phase} onClick={ask} aria-live="polite"
          aria-label={phase === 'yes' || phase === 'no' ? word : 'Lancer'}>
          <span className="coin-face">
            {phase === 'idle' && 'Lancer'}
            {phase === 'spin' && '…'}
            {(phase === 'yes' || phase === 'no') && word}
          </span>
        </button>
      </div>
      {q && (phase === 'yes' || phase === 'no') && <p className="yn-q">« {q} »</p>}
      <button className="primary" onClick={ask} disabled={phase === 'spin'}>
        {phase === 'idle' ? 'Demander au destin' : 'On relance'}
      </button>
    </div>
  )
}
