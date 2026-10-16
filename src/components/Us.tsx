import { useState } from 'react'
import { cat, Heart } from '../cats'
import { avg, type Store } from '../store'
import { CountUp } from './ui'
import { getDesign, setDesign, type Design } from '../design'

export function Us({ store, toast }: { store: Store; toast: (m: string) => void }) {
  const { state, setNames, setMe, clearExamples } = store
  const [sure, setSure] = useState(false)
  const [design, setD] = useState<Design>(getDesign)
  const pick = (d: Design) => { setD(d); setDesign(d) }
  const done = state.items.filter((i) => i.done)
  const rated = done.map(avg).filter(Boolean)
  const best = [...done].sort((x, y) => avg(y) - avg(x))[0]
  const hasExamples = state.items.some((i) => i.example)

  return (
    <div className="page">
      <div className="duo">
        <span className="av big a">{state.names.a[0]}</span>
        <Heart size={30} className="beat" />
        <span className="av big b">{state.names.b[0]}</span>
      </div>
      <div className="stats">
        <div className="stat" style={{ background: 'var(--c-pink)' }}><b><CountUp value={state.items.length - done.length} /></b><span>à faire</span></div>
        <div className="stat" style={{ background: 'var(--c-blue)' }}><b><CountUp value={done.length} /></b><span>faits</span></div>
        <div className="stat" style={{ background: 'var(--c-mint)' }}><b>{rated.length ? <CountUp value={rated.reduce((a, b) => a + b, 0) / rated.length} decimals={1} /> : '–'}</b><span>cœurs en moy.</span></div>
      </div>
      {best && avg(best) > 0 && (
        <div className="best" style={{ background: cat(best.cat).bg, color: cat(best.cat).ink }}>
          <span className="tag">Notre coup de cœur</span>
          <b>{best.title}</b>
          <span>{avg(best).toFixed(1)} / 5</span>
        </div>
      )}

      <div className="section-head"><h2>Style de l'app</h2></div>
      <div className="design-pick">
        <button aria-pressed={design === 'v1'} onClick={() => pick('v1')}>
          <span className="swatches"><i style={{ background: '#F8C9D6' }} /><i style={{ background: '#C3DDF2' }} /><i style={{ background: '#1F4D3A' }} /></span>
          Version 1
        </button>
        <button aria-pressed={design === 'v2'} onClick={() => pick('v2')}>
          <span className="swatches"><i style={{ background: '#FBC9E2' }} /><i style={{ background: '#0F4A2C' }} /></span>
          Version 2
        </button>
      </div>

      <div className="section-head"><h2>Ce téléphone est à</h2></div>
      <div className={'seg' + (state.me === 'b' ? ' right' : '')}>
        <span className="knob" />
        <button aria-pressed={state.me === 'a'} onClick={() => setMe('a')}>{state.names.a}</button>
        <button aria-pressed={state.me === 'b'} onClick={() => setMe('b')}>{state.names.b}</button>
      </div>

      <div className="section-head"><h2>Prénoms</h2></div>
      <div className="names">
        <input id="name-a" aria-label="Premier prénom" maxLength={14} value={state.names.a} onChange={(e) => setNames({ ...state.names, a: e.target.value || ' ' })} />
        <input id="name-b" aria-label="Second prénom" maxLength={14} value={state.names.b} onChange={(e) => setNames({ ...state.names, b: e.target.value || ' ' })} />
      </div>

      {hasExamples && (
        <button className="ghost danger" onClick={() => { if (sure) { clearExamples(); toast('Exemples effacés'); setSure(false) } else setSure(true) }}>
          {sure ? 'Appuie encore pour confirmer' : 'Effacer les exemples'}
        </button>
      )}
      <p className="note">
        Pour l'instant, vos idées restent sur ce téléphone. La synchro entre vos deux téléphones arrive bientôt.
      </p>
    </div>
  )
}
