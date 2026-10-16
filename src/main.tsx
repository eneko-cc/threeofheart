import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { applyDesign } from './design'
import { registerSW } from 'virtual:pwa-register'

applyDesign()

// Plein écran sur iPhone : une fois installée, l'app prend toute la hauteur de l'écran,
// y compris derrière l'heure et la barre du bas (certaines versions d'iOS la raccourcissent sinon).
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
const fit = () => {
  if (!standalone) return
  const h = Math.max(window.innerHeight, document.documentElement.clientHeight, screen.height)
  document.documentElement.style.setProperty('--app-h', `${h}px`)
}
fit()
setTimeout(fit, 400)
window.addEventListener('pageshow', fit)
window.addEventListener('resize', fit)
window.addEventListener('orientationchange', () => setTimeout(fit, 300))

// Nouvelle version en ligne : elle s'installe et l'app se recharge toute seule, on vérifie à chaque retour dans l'app.
const update = registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update() })
  },
})
void update

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
