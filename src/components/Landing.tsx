import { Fragment, useState } from 'react'
import { Mark } from './Mark'
import { Privacy } from './Privacy'
import { useI18n, LANGS, type Lang } from '../i18n'

/**
 * Aparador (landing): el que veu algú que descobreix OneThing per primer cop des
 * del web. Separat de l'app perquè els qui ja la fan servir hi entren directes
 * (PWA instal·lada o ?app=1) i no la veuen mai. Contingut per idioma.
 *
 * La mostra (`mock*`) reprodueix la pantalla de focus amb els components reals,
 * no és una captura: pesa zero, es tradueix sola i no es pot quedar desfasada.
 * Ensenya la transformació (tasca gran → un primer pas ridículament petit)
 * perquè és la promesa sencera; dir-la no convenç, veure-la sí.
 */

type Copy = {
  headline: string
  slogan: string
  pain: string
  diff: string
  cta: string
  who: string
  trust: string
  mockTask: string
  mockLabel: string
  mockStep: string
  mockDone: string
}

const L: Record<Lang, Copy> = {
  en: {
    headline: 'For when you struggle to start.',
    slogan: 'Not another to-do list — a coach that helps you begin.',
    pain: 'You know what you need to do. You’ve known it for days. You still haven’t started.',
    diff: 'ChatGPT gives you a plan. OneThing walks it with you, one step at a time.',
    cta: 'Try it',
    who: 'For ADHD brains · students · knowledge workers · anyone overwhelmed by a big task.',
    trust: 'Free · No sign-up · Your tasks stay on your device',
    mockTask: 'Sort out a year of paperwork',
    mockLabel: 'Your first step',
    mockStep: 'Open the drawer and take out just the top folder.',
    mockDone: 'Done',
  },
  ca: {
    headline: 'Per quan et costa començar.',
    slogan: 'No és una altra to-do list — un coach que t’ajuda a arrencar.',
    pain: 'Saps què has de fer. Fa dies que ho saps. Encara no has començat.',
    diff: 'ChatGPT et dóna un pla. OneThing el camina amb tu, pas a pas.',
    cta: 'Prova-ho',
    who: 'Per a cervells amb TDAH · estudiants · professionals · qui se sent aclaparat per una tasca gran.',
    trust: 'Gratis · Sense compte · Les teves tasques es queden al teu dispositiu',
    mockTask: 'Endreçar tots els papers de l’any',
    mockLabel: 'El teu primer pas',
    mockStep: 'Obre el calaix i treu només la carpeta de dalt.',
    mockDone: 'Fet',
  },
  es: {
    headline: 'Para cuando te cuesta empezar.',
    slogan: 'No es otra lista de tareas — un coach que te ayuda a arrancar.',
    pain: 'Sabes lo que tienes que hacer. Hace días que lo sabes. Todavía no has empezado.',
    diff: 'ChatGPT te da un plan. OneThing lo recorre contigo, paso a paso.',
    cta: 'Pruébalo',
    who: 'Para cerebros con TDAH · estudiantes · profesionales · quien se siente abrumado por una tarea grande.',
    trust: 'Gratis · Sin cuenta · Tus tareas se quedan en tu dispositivo',
    mockTask: 'Ordenar todos los papeles del año',
    mockLabel: 'Tu primer paso',
    mockStep: 'Abre el cajón y saca solo la carpeta de arriba.',
    mockDone: 'Hecho',
  },
}

/** Mostra estàtica de la pantalla de focus. No és interactiva a propòsit. */
function Preview({ c }: { c: Copy }) {
  return (
    <div className="mb-9 w-full max-w-sm rounded-[var(--radius-soft)] border border-line bg-surface px-6 py-7 shadow-sm">
      <p className="truncate text-xs text-muted/70">{c.mockTask}</p>
      <p aria-hidden className="my-2 text-sm text-muted/40">
        ↓
      </p>
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">{c.mockLabel}</p>
      <p className="text-lg leading-snug font-medium text-ink">{c.mockStep}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Mark className="h-5 w-5" />
        <span className="rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white">
          {c.mockDone}
        </span>
      </div>
    </div>
  )
}

export function Landing({ onEnter }: { onEnter: () => void }) {
  const { t, lang, setLang } = useI18n()
  const [showPrivacy, setShowPrivacy] = useState(false)
  const c = L[lang]

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center animate-rise">
      <Mark className="mb-8 h-20 w-20" breathe />
      <h1 className="mb-4 text-3xl font-medium tracking-tight text-ink sm:text-4xl">OneThing</h1>

      <p className="text-lg text-ink">{c.headline}</p>
      <p className="mt-1 mb-8 text-base text-sage-deep">{c.slogan}</p>

      <p className="mb-9 max-w-md text-sm leading-relaxed text-muted">{c.pain}</p>

      <Preview c={c} />

      <button
        onClick={onEnter}
        className="rounded-full bg-sage px-12 py-4 text-lg font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
      >
        {c.cta}
      </button>
      <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted/80">{c.trust}</p>

      <p className="mt-10 max-w-md text-sm italic leading-relaxed text-muted">“{c.diff}”</p>
      <p className="mt-8 max-w-md text-xs leading-relaxed text-muted/70">{c.who}</p>

      <div className="mt-10 flex items-center gap-1.5 text-[11px] text-muted/60">
        {LANGS.map((l, i) => (
          <Fragment key={l.code}>
            {i > 0 && <span aria-hidden>·</span>}
            <button
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
              className={`transition hover:text-ink ${
                lang === l.code ? 'font-medium text-sage-deep' : ''
              }`}
            >
              {l.label}
            </button>
          </Fragment>
        ))}
        <span aria-hidden>·</span>
        <button onClick={() => setShowPrivacy(true)} className="transition hover:text-ink">
          {t('privacy')}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted/50">Ward Technologies Inc.</p>

      {showPrivacy && <Privacy onClose={() => setShowPrivacy(false)} />}
    </div>
  )
}
