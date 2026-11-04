import { useEffect, useRef, useState } from 'react'
import { newId, type Store } from '../store'
import type { Item } from '../types'
import { parseRecipeText, productKey, sourceName, toShopping } from '../recipe'
import { burst } from './ui'

const CART = '<path d="M3 4h2.5l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 8H6.3"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>'
const Ic = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
)

/** Ingrédients (à envoyer sur la liste de courses), étapes à cocher et mode cuisine. */
export function RecipeView({ item, store, toast }: { item: Item; store: Store; toast: (m: string, undo?: () => void) => void }) {
  const { state, upsert, remove, patch } = store
  const ings = item.ingredients ?? []
  const steps = item.steps ?? []
  const shop = state.items.filter((i) => i.cat === 'courses' && !i.done)
  const onList = (ing: string) => shop.find((i) => productKey(i.title) === productKey(ing))
  const missing = ings.filter((x) => !onList(x))
  const [done, setDone] = useState<Set<number>>(new Set())
  const [cooking, setCooking] = useState(false)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  const addOne = (ing: string): Item => {
    const it: Item = { id: newId(), title: toShopping(ing), cat: 'courses', by: state.me, createdAt: Date.now(), note: item.title }
    upsert(it)
    return it
  }
  const toggle = (ing: string, el: HTMLElement) => {
    const on = onList(ing)
    if (on) { remove(on.id); return }
    addOne(ing)
    burst(el, 5)
  }
  const addAll = (el: HTMLElement) => {
    const added = missing.map(addOne)
    burst(el, 14)
    toast(`${added.length} ${added.length > 1 ? 'ingrédients ajoutés' : 'ingrédient ajouté'} aux courses`, () => added.forEach((a) => remove(a.id)))
  }

  // mode cuisine : l'écran reste allumé, les étapes passent en grand
  const cook = async () => {
    if (cooking) { await lock.current?.release().catch(() => {}); lock.current = null; setCooking(false); return }
    setCooking(true)
    try { lock.current = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch {}
  }
  useEffect(() => () => { lock.current?.release().catch(() => {}) }, [])
  const current = steps.findIndex((_, k) => !done.has(k))

  return (
    <>
      {item.url && (
        <a className="src-link" href={item.url} target="_blank" rel="noreferrer">
          <Ic d='<path d="M8 5.5v13l10-6.5z"/>' size={16} />Voir sur {sourceName(item.url)}
        </a>
      )}

      {!ings.length && !!item.note && (
        <button className="go-btn" onClick={() => {
          const p = parseRecipeText(item.note!)
          if (!p.ingredients.length && !p.steps.length) { toast('Pas d’ingrédients trouvés, ajoute-les avec Modifier'); return }
          patch(item.id, { ingredients: p.ingredients, steps: p.steps.length ? p.steps : item.steps })
          toast('Recette rangée')
        }}>Ranger la description en ingrédients et étapes</button>
      )}

      {!!ings.length && (
        <section className="block ings">
          <div className="block-head">
            <h3>Ingrédients <span>{ings.length}</span></h3>
            {missing.length ? (
              <button className="add-all" onClick={(e) => addAll(e.currentTarget)}><Ic d={CART} size={16} />Tout aux courses</button>
            ) : <span className="all-on">Tout est sur la liste ✓</span>}
          </div>
          <ul>
            {ings.map((x, k) => {
              const on = !!onList(x)
              return (
                <li key={k}>
                  <button className={'ing' + (on ? ' on' : '')} aria-pressed={on} onClick={(e) => toggle(x, e.currentTarget.querySelector('.ing-cart')!)}
                    aria-label={(on ? 'Retirer des courses : ' : 'Ajouter aux courses : ') + x}>
                    <span className="ing-name">{x}</span>
                    <span className="ing-cart">{on ? <Ic d='<path d="M5 12.5l4.5 4.5L19 7.5"/>' size={16} /> : <Ic d='<path d="M12 6v12M6 12h12"/>' size={16} />}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="hint">Touche un ingrédient pour l'ajouter à la liste de courses.</p>
        </section>
      )}

      {!!steps.length && (
        <section className={'block steps' + (cooking ? ' cooking' : '')}>
          <div className="block-head">
            <h3>Étapes <span>{steps.length}</span></h3>
            <button className={'cook-btn' + (cooking ? ' on' : '')} onClick={cook} aria-pressed={cooking}>
              {cooking ? 'Fin du mode cuisine' : 'Mode cuisine'}
            </button>
          </div>
          {cooking && <p className="hint">L'écran reste allumé. Touche une étape quand elle est faite.</p>}
          <ol>
            {steps.map((x, k) => (
              <li key={k}>
                <button className={'step' + (done.has(k) ? ' done' : '') + (k === current ? ' now' : '')}
                  onClick={() => setDone((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })}>
                  <span className="step-n">{done.has(k) ? '✓' : k + 1}</span>
                  <span className="step-t">{x}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  )
}
