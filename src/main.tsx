import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { applyDesign } from './design'
import { registerSW } from 'virtual:pwa-register'

applyDesign()

// Barre d'état iOS en mode « default » : l'app commence sous l'heure et occupe exactement le reste
// de l'écran. (En mode translucide, iOS 26 annonce une fenêtre trop courte et coupe le bas.)

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
