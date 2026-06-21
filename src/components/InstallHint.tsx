import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

/**
 * Suggeriment discret per instal·lar la PWA. Filosofia onething: res de modals ni
 * advertiments a l'inici. Només un xip al peu, descartable, i que apareix:
 *  - a Chrome/Edge/Android via `beforeinstallprompt` → botó que obre el diàleg natiu,
 *  - a iOS/Safari (que no el dispara) → una instrucció manual breu,
 * sempre que l'app NO estigui ja instal·lada i no s'hagi descartat abans.
 */

const DISMISS_KEY = 'onething-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

export function InstallHint() {
  const { t } = useI18n()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1' || isStandalone(),
  )
  // iOS/Safari no dispara beforeinstallprompt: oferim la instrucció manual.
  const iosHint = isIOS && !isStandalone()

  useEffect(() => {
    if (dismissed) return

    const onPrompt = (e: Event) => {
      e.preventDefault() // evitem el mini-infobar del navegador; el controlem nosaltres
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      // Amaguem el xip per a aquesta sessió, però SENSE persistir-ho: si després
      // l'usuari desinstal·la, el suggeriment discret ha de poder tornar.
      // ("Instal·lat" no és el mateix que "descartat" — la ✕ sí que persisteix.)
      setDismissed(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [dismissed])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    dismiss()
  }

  if (dismissed || (!deferred && !iosHint)) return null

  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-muted/70">
      {deferred ? (
        <button
          onClick={install}
          className="rounded-full border border-line bg-surface px-3 py-1 transition hover:border-sage hover:text-sage-deep"
        >
          {t('install')}
        </button>
      ) : (
        <span className="max-w-xs">{t('install_ios')}</span>
      )}
      <button
        onClick={dismiss}
        aria-label={t('dismiss')}
        className="shrink-0 transition hover:text-ink"
      >
        ✕
      </button>
    </div>
  )
}
