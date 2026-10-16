import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { applyDesign } from './design'

applyDesign()

// Plein écran sur iPhone : une fois installée, l'app prend toute la hauteur de l'écran,
// y compris derrière l'heure et la barre du bas (certaines versions d'iOS la raccourcissent sinon).
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
const fit = () => {
  if (!standalone) return
  const h = Math.max(window.innerHeight, screen.height)
  document.documentElement.style.setProperty('--app-h', `${h}px`)
}
fit()
window.addEventListener('resize', fit)
window.addEventListener('orientationchange', () => setTimeout(fit, 300))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
