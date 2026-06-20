import { useEffect, useState } from 'react'
import type { Task } from '../db'
import { breakdownTask, type Feeling } from '../ai'

interface Props {
  task: Task
  onClose: () => void
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

const FEELINGS: { key: Feeling; label: string }[] = [
  { key: 'clar', label: 'Ho tinc clar' },
  { key: 'mandra', label: 'Em fa mandra' },
  { key: 'bloquejat', label: 'Estic bloquejat' },
  { key: 'ansietat', label: 'Em genera ansietat' },
]

// minutes: 0 = sense límit (cap compte enrere ni check-in).
const TIMES: { label: string; minutes: number }[] = [
  { label: '2 minuts', minutes: 2 },
  { label: '5 minuts', minutes: 5 },
  { label: '15 minuts', minutes: 15 },
  { label: '30 minuts', minutes: 30 },
  { label: 'Sense límit', minutes: 0 },
]

export function FocusMode({ task, onClose, onSteps, onToggleStep, onMinutes }: Props) {
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
  const [cheer, setCheer] = useState<string | null>(null)

  // El primer pas pendent és el nostre "únic objectiu ara". Mai ensenyem la
  // llista sencera: una sola cosa a la vegada (menys càrrega cognitiva).
  const currentIndex = hasSteps ? steps.findIndex((_, i) => !doneSteps.has(i)) : -1
  const showStep = currentIndex !== -1
  const isLastPending = doneSteps.size === steps.length - 1

  // El cercle: compte enrere del temps que t'has donat (calma, no pressió). Si no
  // n'has triat cap, queda buit — sense comptador que puja.
  const total = (task.focusMinutes ?? 0) * 60
  const remaining = Math.max(total - elapsed, 0)
  // Check-in derivat: quan s'esgota el temps triat, el panell apareix sol.
  const timeUp = showStep && total > 0 && elapsed >= total

  // El compte enrere només corre quan ja hi ha un pas a la vista (la IA ha
  // respost). Mentre tries / esperes "Pensant…", el temps no s'esgota.
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
    onToggleStep(currentIndex)
    // Celebrar l'arrencada: el primer pas és el més difícil per a un cervell TDAH.
    if (wasFirst && !isLastPending) {
      setCheer('Ja has començat.')
      setTimeout(() => setCheer(null), 1600)
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

  async function startBreakdown(minutes: number) {
    onMinutes(minutes)
    setElapsed(0) // el compte enrere arrenca des del temps sencer
    setLoading(true)
    try {
      const { steps } = await breakdownTask(task.title, {
        feeling: feeling ?? undefined,
        minutes,
      })
      onSteps(steps)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Contenidor amb scroll: min-h-full + justify-center centra quan hi cap i
    // deixa fer scroll quan no hi cap (pantalles petites).
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-10 text-sm text-muted hover:text-ink transition-colors"
        aria-label="Tancar el mode focus"
      >
        Tanca ✕
      </button>

      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center animate-rise">

      {/* Cercle que respira: ancora visual de calma + compte enrere si n'hi ha;
          mentre no hi ha temps, tres punts que palpiten suaument (esperant…). */}
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
        <p className="text-lg text-muted">Pensant…</p>
      ) : showStep ? (
        /* Un sol pas a la vegada: el teu únic objectiu ara */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          <p className="mb-2 text-sm uppercase tracking-widest text-muted">
            El teu únic objectiu ara
          </p>
          <h1 className="mb-8 max-w-2xl text-3xl leading-snug font-medium text-ink sm:text-4xl">
            {steps[currentIndex]}
          </h1>

          {/* Progrés discret: punts, sense revelar la llista sencera */}
          <div
            className="mb-10 flex items-center gap-1.5"
            aria-label={`Pas ${currentIndex + 1} de ${steps.length}`}
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

          <button
            onClick={completeStep}
            className="rounded-full bg-sage px-10 py-4 text-lg font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
          >
            {isLastPending ? 'Fet ✓' : 'Fet, següent →'}
          </button>
        </>
      ) : phase === 'time' ? (
        /* Pantalla "Quant temps tens?": acota el primer pas */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          <h1 className="mb-8 text-2xl font-medium text-ink sm:text-3xl">
            Quant temps tens ara?
          </h1>
          <div className="flex w-full max-w-xs flex-col gap-2.5">
            {TIMES.map((t) => (
              <button
                key={t.label}
                onClick={() => startBreakdown(t.minutes)}
                className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPhase('feeling')}
            className="mt-8 text-sm text-muted transition hover:text-ink"
          >
            Enrere
          </button>
        </>
      ) : (
        /* Pantalla "Com et sents?": context emocional per a la IA (entrada directa) */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          <h1 className="mb-8 text-2xl font-medium text-ink sm:text-3xl">Com et sents?</h1>
          <div className="flex w-full max-w-xs flex-col gap-2.5">
            {FEELINGS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFeeling(f.key)
                  setPhase('time')
                }}
                className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="mt-8 text-sm text-muted transition hover:text-ink"
          >
            Enrere
          </button>
        </>
      )}
      </div>

      {/* Check-in: apareix quan s'acaba el temps que t'havies donat */}
      {(timeUp || distracted) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-paper/95 px-6 text-center animate-rise">
          {distracted ? (
            <p className="max-w-sm text-xl leading-relaxed text-sage-deep">
              Cap problema.
              <br />
              Tornem al punt on érem.
            </p>
          ) : (
            <>
              <p className="mb-8 max-w-sm text-xl font-medium leading-snug text-ink">
                S’ha acabat el temps que t’havies donat. Com ha anat?
              </p>
              <div className="flex w-full max-w-xs flex-col gap-2.5">
                <button
                  onClick={checkinDone}
                  className="rounded-full bg-sage px-8 py-3.5 font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
                >
                  Ho he fet ✓
                </button>
                <button
                  onClick={checkinMore}
                  className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
                >
                  Encara hi soc
                </button>
                <button
                  onClick={checkinDistracted}
                  className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
                >
                  M’he distret
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Microcelebració de l'arrencada: "Ja has començat." */}
      {cheer && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-paper/80 backdrop-blur-sm animate-rise">
          <p className="text-2xl text-sage-deep">{cheer}</p>
        </div>
      )}
    </div>
  )
}
