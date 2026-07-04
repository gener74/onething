import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import { Root } from './Root.tsx'
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
      <Root />
      {/* Comptador de visites anònim i sense cookies (Vercel Web Analytics).
          NO toca les dades de les tasques (viuen a IndexedDB): només compta
          càrregues de pàgina. El local-first es manté intacte. */}
      <Analytics />
    </I18nProvider>
  </StrictMode>,
)
