import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { applyDesign } from './design'
import { registerSW } from 'virtual:pwa-register'

applyDesign()

// Plein écran iPhone. Sur iOS 26, l'app installée affiche une zone plus courte que l'écran
// (il manque la hauteur de la barre de l'heure en bas, tout ce qui dépasse est coupé).
// On cale donc l'app sur la zone vraiment affichée, et dans ce cas la marge du bas n'est plus utile.
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
const fit = () => {
  if (!standalone) return
  const root = document.documentElement
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;padding-top:env(safe-area-inset-top);visibility:hidden'
  document.body.appendChild(probe)
  const top = parseFloat(getComputedStyle(probe).paddingTop) || 0
  probe.remove()
  const h = window.innerHeight
  const short = top > 0 && screen.height - h > 20
  root.style.setProperty('--app-h', `${h}px`)
  root.classList.toggle('ios-short', short)
  if (short) root.style.setProperty('--sab', '6px')
  else root.style.removeProperty('--sab')
}
fit()
setTimeout(fit, 400)
window.addEventListener('pageshow', fit)
window.addEventListener('orientationchange', () => setTimeout(fit, 300))

// Nouvelle version en ligne : elle s'installe et l'app se recharge toute seule, on vérifie à chaque retour dans l'app.
const update = registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      reg.update()
      ;(navigator as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {})
    })
  },
})
void update
;(navigator as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
