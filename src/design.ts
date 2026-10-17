// Deux styles d'interface : Mode Toni (bleu, carotte, citron vert) et Mode Ju (palette de Ju).
export type Design = 'v1' | 'v2'
const KEY = 'toh-design'

export function getDesign(): Design {
  try { return (localStorage.getItem(KEY) as Design) || 'v2' } catch { return 'v2' }
}

export function applyDesign(d: Design = getDesign()) {
  document.documentElement.dataset.design = d
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', d === 'v2' ? '#FFF6F1' : '#0038BD')
}

export function setDesign(d: Design) {
  try { localStorage.setItem(KEY, d) } catch {}
  applyDesign(d)
  window.dispatchEvent(new Event('toh-design'))
}
