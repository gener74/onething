import { Fragment } from 'react'
import { Mark } from './Mark'
import { useI18n, LANGS, type Lang } from '../i18n'

/**
 * Aparador (landing): el que veu algú que descobreix OneThing per primer cop des
 * del web. Separat de l'app perquè els qui ja la fan servir hi entren directes
 * (PWA instal·lada o ?app=1) i no la veuen mai. Contingut per idioma.
 */

const L: Record<
  Lang,
  { headline: string; slogan: string; pain: string; diff: string; cta: string; who: string }
> = {
  en: {
    headline: 'For when you struggle to start.',
    slogan: 'Not another to-do list — a coach that helps you begin.',
    pain: 'You know what you need to do. You’ve known it for days. You still haven’t started.',
    diff: 'ChatGPT gives you a plan. OneThing walks it with you, one step at a time.',
    cta: 'Try it',
    who: 'For ADHD brains · students · knowledge workers · anyone overwhelmed by a big task.',
  },
  ca: {
    headline: 'Per quan et costa començar.',
    slogan: 'No és una altra to-do list — un coach que t’ajuda a arrencar.',
    pain: 'Saps què has de fer. Fa dies que ho saps. Encara no has començat.',
    diff: 'ChatGPT et dóna un pla. OneThing el camina amb tu, pas a pas.',
    cta: 'Prova-ho',
    who: 'Per a cervells amb TDAH · estudiants · professionals · qui se sent aclaparat per una tasca gran.',
  },
  es: {
    headline: 'Para cuando te cuesta empezar.',
    slogan: 'No es otra lista de tareas — un coach que te ayuda a arrancar.',
    pain: 'Sabes lo que tienes que hacer. Hace días que lo sabes. Todavía no has empezado.',
    diff: 'ChatGPT te da un plan. OneThing lo recorre contigo, paso a paso.',
    cta: 'Pruébalo',
    who: 'Para cerebros con TDAH · estudiantes · profesionales · quien se siente abrumado por una tarea grande.',
  },
}

export function Landing({ onEnter }: { onEnter: () => void }) {
  const { lang, setLang } = useI18n()
  const c = L[lang]

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center animate-rise">
      <Mark className="mb-8 h-20 w-20" breathe />
      <h1 className="mb-4 text-3xl font-medium tracking-tight text-ink sm:text-4xl">OneThing</h1>

      <p className="text-lg text-ink">{c.headline}</p>
      <p className="mt-1 mb-8 text-base text-sage-deep">{c.slogan}</p>

      <p className="mb-9 max-w-md text-sm leading-relaxed text-muted">{c.pain}</p>

      <button
        onClick={onEnter}
        className="rounded-full bg-sage px-12 py-4 text-lg font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
      >
        {c.cta}
      </button>

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
      </div>
      <p className="mt-3 text-[11px] text-muted/50">Ward Technologies Inc.</p>
    </div>
  )
}
