import { useEffect, useState } from 'react'
import type { Task } from '../db'
import { breakdownTask, type Feeling } from '../ai'
import { useI18n } from '../i18n'
import { Leaves } from './Leaves'

interface Props {
  task: Task
  onClose: () => void
  onComplete: () => void
  onSteps: (steps: string[]) => void
  onToggleStep: (index: number) => void
  onMinutes: (minutes: number) => void
}

/** Format mm:ss */
function fmt(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

const FEELINGS: Feeling[] = ['clar', 'mandra', 'bloquejat', 'ansietat']

// 0 = sense límit (cap compte enrere ni check-in).
const TIMES = [2, 5, 15, 30, 0]

export function FocusMode({
  task,
  onClose,
  onComplete,
  onSteps,
  onToggleStep,
  onMinutes,
}: Props) {
  const { t, tn, lang } = useI18n()
  const doneSteps = new Set(task.doneSteps ?? [])
  const steps = task.steps ?? []
  const hasSteps = steps.length > 0
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  // Camí d'ajuda quan encara no hi ha passos: com et sents → quant temps.
  const [phase, setPhase] = useState<'feeling' | 'time'>('feeling')
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  // Check-in en acabar el temps + microcelebració de l'arrencada.
  const [distracted, setDistracted] = useState(false)
  const [cheer, setCheer] = useState(false)
  // Quota diària de la IA: si s'ha arribat al límit i quants en queden avui.
  const [aiLimited, setAiLimited] = useState(false)
  const [aiRemaining, setAiRemaining] = useState<number | null>(null)

  // El primer pas pendent és el nostre "únic objectiu ara". Mai ensenyem la
  // llista sencera: una sola cosa a la vegada (menys càrrega cognitiva).
  const currentIndex = hasSteps ? steps.findIndex((_, i) => !doneSteps.has(i)) : -1
  const showStep = currentIndex !== -1
  const isLastPending = doneSteps.size === steps.length - 1
  // Tots els passos fets: no auto-completem; preguntem si la tasca ja està acabada.
  const allDone = hasSteps && currentIndex === -1

  // El cercle: compte enrere del temps que t'has donat (calma, no pressió).
  const total = (task.focusMinutes ?? 0) * 60
  const remaining = Math.max(total - elapsed, 0)
  // Check-in derivat: quan s'esgota el temps triat, el panell apareix sol.
  const timeUp = showStep && total > 0 && elapsed >= total

  // El compte enrere només corre quan ja hi ha un pas a la vista (la IA ha respost).
  useEffect(() => {
    if (!showStep) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [showStep])

  // Tecla Escape per sortir.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function completeStep() {
    const wasFirst = doneSteps.size === 0
    navigator.vibrate?.(10) // toc hàptic suau (si el navegador ho suporta)
    onToggleStep(currentIndex)
    // Celebrar l'arrencada: el primer pas és el més difícil per a un cervell TDAH.
    if (wasFirst && !isLastPending) {
      setCheer(true)
      setTimeout(() => setCheer(false), 1600)
    }
  }

  // Respostes del check-in. "Encara hi soc" i "M'he distret" només reinicien el
  // temps (sense penalització); la diferència és el to del missatge.
  function checkinDone() {
    setElapsed(0)
    completeStep()
  }
  function checkinMore() {
    setElapsed(0)
  }
  function checkinDistracted() {
    setDistracted(true)
    setTimeout(() => {
      setDistracted(false)
      setElapsed(0)
    }, 1800)
  }

  // Tornar a generar el desglossament: neteja els passos i el temps, i torna a
  // la pantalla "Com et sents?" per demanar-ne uns altres.
  function regenerate() {
    onSteps([])
    onMinutes(0)
    setElapsed(0)
    setFeeling(null)
    setPhase('feeling')
    setAiLimited(false)
    setAiRemaining(null)
  }

  async function startBreakdown(minutes: number) {
    onMinutes(minutes)
    setElapsed(0) // el compte enrere arrenca des del temps sencer
    setLoading(true)
    try {
      const { steps, limited, used, limit } = await breakdownTask(task.title, {
        feeling: feeling ?? undefined,
        minutes,
        lang,
      })
      onSteps(steps)
      setAiLimited(!!limited)
      setAiRemaining(
        limit != null && used != null ? Math.max(limit - used, 0) : null,
      )
    } finally {
      setLoading(false)
    }
  }

  const timeLabel = (m: number) => (m === 0 ? t('no_limit') : tn('minutes', m))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      {/* Mentre la IA pensa, unes fulles cauen de fons (espera calmada) */}
      {loading && <Leaves />}
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-10 text-sm text-muted hover:text-ink transition-colors"
        aria-label={t('close_focus_aria')}
      >
        {t('close')} ✕
      </button>

      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center animate-rise">

      {/* Cercle que respira: compte enrere si n'hi ha; si no, tres punts que palpiten. */}
      <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-sage-soft animate-breathe">
        {total > 0 ? (
          <span className="font-mono text-lg text-sage-deep">{fmt(remaining)}</span>
        ) : (
          <span className="flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-sage animate-pulse-soft"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-lg text-muted">{t('thinking')}</p>
      ) : allDone ? (
        /* Tots els passos fets: tu decideixes si la tasca està acabada o continues */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          <p className="mb-8 max-w-sm text-xl font-medium leading-snug text-ink">
            {t('steps_done_q')}
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2.5">
            <button
              onClick={onComplete}
              className="rounded-full bg-sage px-8 py-3.5 font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
            >
              {t('finished')}
            </button>
            <button
              onClick={regenerate}
              className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
            >
              {t('keep_going')}
            </button>
          </div>
        </>
      ) : showStep ? (
        /* Un sol pas a la vegada: el teu únic objectiu ara */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          <p className="mb-2 text-sm uppercase tracking-widest text-muted">{t('your_goal')}</p>
          <h1 className="mb-8 max-w-2xl text-3xl leading-snug font-medium text-ink sm:text-4xl">
            {steps[currentIndex]}
          </h1>

          {/* Progrés discret: punts, sense revelar la llista sencera */}
          <div
            className="mb-10 flex items-center gap-1.5"
            aria-label={t('step_of', { i: currentIndex + 1, n: steps.length })}
          >
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition ${
                  doneSteps.has(i)
                    ? 'bg-sage'
                    : i === currentIndex
                      ? 'scale-125 bg-sage-deep'
                      : 'bg-line'
                }`}
              />
            ))}
          </div>

          {aiLimited ? (
            <p className="mb-4 max-w-xs text-xs leading-relaxed text-muted">
              {t('ai_limit_reached')}
            </p>
          ) : aiRemaining !== null && aiRemaining > 0 && aiRemaining <= 3 ? (
            <p className="mb-4 text-xs text-muted/70">{tn('ai_remaining', aiRemaining)}</p>
          ) : null}

          <button
            onClick={completeStep}
            className="rounded-full bg-sage px-10 py-4 text-lg font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
          >
            {isLastPending ? t('done_check') : t('done_next')}
          </button>

          <button
            onClick={regenerate}
            className="mt-6 text-sm text-muted transition hover:text-ink"
          >
            {t('regen')}
          </button>
        </>
      ) : phase === 'time' ? (
        /* Pantalla "Quant temps tens?": acota el primer pas */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          <h1 className="mb-8 text-2xl font-medium text-ink sm:text-3xl">{t('time_q')}</h1>
          <div className="flex w-full max-w-xs flex-col gap-2.5">
            {TIMES.map((m) => (
              <button
                key={m}
                onClick={() => startBreakdown(m)}
                className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
              >
                {timeLabel(m)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPhase('feeling')}
            className="mt-8 text-sm text-muted transition hover:text-ink"
          >
            {t('back')}
          </button>
        </>
      ) : (
        /* Pantalla "Com et sents?": context emocional per a la IA (entrada directa) */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          <h1 className="mb-8 text-2xl font-medium text-ink sm:text-3xl">{t('feeling_q')}</h1>
          <div className="flex w-full max-w-xs flex-col gap-2.5">
            {FEELINGS.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFeeling(f)
                  setPhase('time')
                }}
                className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
              >
                {t(`feeling_${f}`)}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="mt-8 text-sm text-muted transition hover:text-ink"
          >
            {t('back')}
          </button>
        </>
      )}
      </div>

      {/* Check-in: apareix quan s'acaba el temps que t'havies donat */}
      {(timeUp || distracted) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-paper/95 px-6 text-center animate-rise">
          {distracted ? (
            <p className="max-w-sm text-xl leading-relaxed text-sage-deep">{t('distracted_msg')}</p>
          ) : (
            <>
              <p className="mb-8 max-w-sm text-xl font-medium leading-snug text-ink">
                {t('checkin_q')}
              </p>
              <div className="flex w-full max-w-xs flex-col gap-2.5">
                <button
                  onClick={checkinDone}
                  className="rounded-full bg-sage px-8 py-3.5 font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
                >
                  {t('checkin_done')}
                </button>
                <button
                  onClick={checkinMore}
                  className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
                >
                  {t('checkin_more')}
                </button>
                <button
                  onClick={checkinDistracted}
                  className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
                >
                  {t('checkin_distracted')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Microcelebració de l'arrencada */}
      {cheer && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-paper/80 backdrop-blur-sm animate-rise">
          <p className="text-2xl text-sage-deep">{t('cheer_started')}</p>
        </div>
      )}
    </div>
  )
}
