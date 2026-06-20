import { useState } from 'react'
import { Mark } from './Mark'
import { useI18n } from '../i18n'

/**
 * Portada privada amb contrasenya simple.
 *
 * La contrasenya viu en una variable d'entorn (VITE_GATE_CODE), NO al codi: el
 * repositori és públic. Si no n'hi ha cap configurada, la porta queda oberta
 * (útil en dev sense `.env.local`).
 *
 * És una tanca per a curiosos, no una caixa forta: com que Vite inserta el valor
 * al bundle en temps de build, algú tècnic el pot trobar. Suficient per mantenir
 * la versió privada mentre encara s'està polint.
 */
const CODE = import.meta.env.VITE_GATE_CODE as string | undefined
const STORAGE_KEY = 'onething-gate'

export function Gate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  // Porta oberta si no hi ha codi, o si aquest navegador ja l'ha desbloquejat.
  const [unlocked, setUnlocked] = useState(
    () => !CODE || localStorage.getItem(STORAGE_KEY) === CODE,
  )
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim() === CODE) {
      // Recorda el desbloqueig en aquest navegador per no tornar a preguntar.
      localStorage.setItem(STORAGE_KEY, CODE!)
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center px-6 text-center animate-rise">
      <Mark className="mb-8 h-20 w-20" breathe />
      <h1 className="mb-1 text-2xl font-medium tracking-tight text-ink">Onething</h1>
      <p className="mb-8 text-sm text-muted">{t('gate_private')}</p>

      <form onSubmit={submit} className="w-full">
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          placeholder={t('gate_password')}
          aria-label={t('gate_password')}
          autoFocus
          className="w-full rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3.5 text-center text-ink placeholder:text-muted/70 focus:border-sage focus:outline-none"
        />
        {error && <p className="mt-3 text-sm text-muted">{t('gate_wrong')}</p>}
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-sage px-6 py-3 font-medium text-white shadow-sm transition hover:bg-sage-deep active:scale-95"
        >
          {t('gate_enter')}
        </button>
      </form>
    </div>
  )
}
