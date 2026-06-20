import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Gate } from './components/Gate.tsx'
import { I18nProvider } from './i18n.tsx'
import { requestPersistence } from './db.ts'

// Protegeix les dades locals del desallotjament automàtic (no bloqueja l'arrencada).
void requestPersistence()

// Tema: tria desada o, si no n'hi ha, la preferència del sistema. Es fixa abans
// de pintar perquè no hi hagi flaix de tema clar.
{
  const saved = localStorage.getItem('onething-theme')
  const dark = saved
    ? saved === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', dark)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Gate>
        <App />
      </Gate>
    </I18nProvider>
  </StrictMode>,
)
