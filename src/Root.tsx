import { useState } from 'react'
import App from './App'
import { pingEvent } from './ai'
import { Gate } from './components/Gate'
import { Landing } from './components/Landing'

/**
 * Decideix què mostrar: la landing (aparador) només a qui descobreix l'app per
 * primer cop des del web. Entren directes a l'app: PWA instal·lada (display
 * standalone o ?app=1) i qui ja hi ha entrat abans (es recorda a localStorage).
 */
function shouldEnterApp(): boolean {
  if (new URLSearchParams(window.location.search).has('app')) return true
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return localStorage.getItem('onething-entered') === '1'
}

export function Root() {
  const [entered, setEntered] = useState(shouldEnterApp)
  if (!entered) {
    return (
      <Landing
        onEnter={() => {
          localStorage.setItem('onething-entered', '1')
          // Mètrica anònima: la landing ha convertit. Només aquí — qui ja hi ha
          // entrat abans o ve de la PWA no passa per la landing i no compta.
          pingEvent('entered')
          setEntered(true)
        }}
      />
    )
  }
  return (
    <Gate>
      <App />
    </Gate>
  )
}
