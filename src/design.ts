// Deux styles d'interface : Version 1 (pastels) et Version 2 (Pink Lace & Forest Green).
export type Design = 'v1' | 'v2'
const KEY = 'toh-design'

export function getDesign(): Design {
  try { return (localStorage.getItem(KEY) as Design) || 'v2' } catch { return 'v2' }
}

export function applyDesign(d: Design = getDesign()) {
  document.documentElement.dataset.design = d
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', d === 'v2' ? '#0F4A2C' : '#16302A')
}

export function setDesign(d: Design) {
  try { localStorage.setItem(KEY, d) } catch {}
  applyDesign(d)
  window.dispatchEvent(new Event('toh-design'))
}
