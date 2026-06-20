import { useI18n, type Lang } from '../i18n'

/**
 * Nota de privacitat: curta, calmada i honesta. El moll de l'os és deixar clar
 * que tot és local EXCEPTE una cosa — el text de la tasca viatja a Claude quan
 * demanes el desglossament. Text complet per idioma (és contingut llarg; no té
 * sentit trossejar-lo a l'i18n general).
 */

const CONTENT: Record<Lang, { title: string; body: string[] }> = {
  en: {
    title: 'Privacy',
    body: [
      'OneThing is local-first. Your tasks live only in this browser, on this device. There are no accounts, and no server keeps a copy of your data.',
      'The one exception: when you ask the AI to break a task down (“I don’t know where to start”), the task’s text — together with how you feel and how much time you have — is sent to Anthropic (the makers of Claude) to generate the steps. It’s used only to produce that answer; it isn’t stored by us.',
      'No tracking, no analytics, no cookies, no advertising. Nothing follows you around.',
      'Your data is yours. Use “Save a copy” to export it and “Recover” to bring it back — a plain file only you control.',
    ],
  },
  ca: {
    title: 'Privacitat',
    body: [
      'OneThing és local-first. Les teves tasques viuen només en aquest navegador, en aquest dispositiu. No hi ha comptes, i cap servidor en guarda una còpia.',
      'L’única excepció: quan demanes a la IA que parteixi una tasca (“No sé per on començar”), el text de la tasca —junt amb com et sents i quant temps tens— s’envia a Anthropic (els creadors de Claude) per generar els passos. Només s’utilitza per donar aquesta resposta; nosaltres no el desem.',
      'Sense rastreig, sense analítica, sense galetes, sense publicitat. Res no et segueix.',
      'Les teves dades són teves. Fes servir “Desa una còpia” per exportar-les i “Recupera” per tornar-les —un fitxer senzill que controles només tu.',
    ],
  },
  es: {
    title: 'Privacidad',
    body: [
      'OneThing es local-first. Tus tareas viven solo en este navegador, en este dispositivo. No hay cuentas, y ningún servidor guarda una copia de tus datos.',
      'La única excepción: cuando pides a la IA que desglose una tarea (“No sé por dónde empezar”), el texto de la tarea —junto con cómo te sientes y cuánto tiempo tienes— se envía a Anthropic (los creadores de Claude) para generar los pasos. Solo se usa para dar esa respuesta; nosotros no lo guardamos.',
      'Sin rastreo, sin analítica, sin cookies, sin publicidad. Nada te sigue.',
      'Tus datos son tuyos. Usa “Guarda una copia” para exportarlos y “Recupera” para traerlos de vuelta —un archivo sencillo que controlas solo tú.',
    ],
  },
}

export function Privacy({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n()
  const { title, body } = CONTENT[lang]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-10 text-sm text-muted transition-colors hover:text-ink"
        aria-label={t('close_aria')}
      >
        {t('close')} ✕
      </button>

      <div className="mx-auto max-w-xl px-5 pt-10 pb-24 animate-rise">
        <h1 className="mb-6 text-2xl font-medium tracking-tight text-ink">{title}</h1>
        <div className="space-y-4">
          {body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted">
              {p}
            </p>
          ))}
        </div>
        <p className="mt-10 text-[11px] text-muted/50">Ward Technologies Inc.</p>
      </div>
    </div>
  )
}
