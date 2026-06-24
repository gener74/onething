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
      'No cookies, no advertising, no profiles, no accounts — nothing follows you around and nothing is tied to you.',
      'The only thing we count is two anonymous totals: how many breakdowns are shown, and how many reach a first step. It tells us whether OneThing actually helps people get started. No content and no identifier ever leave with it — just a +1.',
      'Your data is yours. Use “Save a copy” to export it and “Recover” to bring it back — a plain file only you control.',
    ],
  },
  ca: {
    title: 'Privacitat',
    body: [
      'OneThing és local-first. Les teves tasques viuen només en aquest navegador, en aquest dispositiu. No hi ha comptes, i cap servidor en guarda una còpia.',
      'L’única excepció: quan demanes a la IA que parteixi una tasca (“No sé per on començar”), el text de la tasca —junt amb com et sents i quant temps tens— s’envia a Anthropic (els creadors de Claude) per generar els passos. Només s’utilitza per donar aquesta resposta; nosaltres no el desem.',
      'Sense galetes, sense publicitat, sense perfils, sense comptes —res no et segueix i res no va lligat a tu.',
      'L’única cosa que comptem són dos totals anònims: quants desglossaments es mostren i quants arriben al primer pas. Ens diu si OneThing ajuda de debò a començar. Mai no hi viatja cap contingut ni cap identificador —només un +1.',
      'Les teves dades són teves. Fes servir “Desa una còpia” per exportar-les i “Recupera” per tornar-les —un fitxer senzill que controles només tu.',
    ],
  },
  es: {
    title: 'Privacidad',
    body: [
      'OneThing es local-first. Tus tareas viven solo en este navegador, en este dispositivo. No hay cuentas, y ningún servidor guarda una copia de tus datos.',
      'La única excepción: cuando pides a la IA que desglose una tarea (“No sé por dónde empezar”), el texto de la tarea —junto con cómo te sientes y cuánto tiempo tienes— se envía a Anthropic (los creadores de Claude) para generar los pasos. Solo se usa para dar esa respuesta; nosotros no lo guardamos.',
      'Sin cookies, sin publicidad, sin perfiles, sin cuentas —nada te sigue y nada va ligado a ti.',
      'Lo único que contamos son dos totales anónimos: cuántos desgloses se muestran y cuántos llegan al primer paso. Nos dice si OneThing ayuda de verdad a empezar. Nunca viaja ningún contenido ni identificador —solo un +1.',
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
