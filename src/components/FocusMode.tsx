import { useEffect, useState } from 'react'
import type { Task } from '../db'
import { breakdownTask } from '../ai'

interface Props {
  task: Task
  onComplete: () => void
  onClose: () => void
  onSteps: (steps: string[]) => void
  onToggleStep: (index: number) => void
}

/** Format mm:ss */
function fmt(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function FocusMode({ task, onComplete, onClose, onSteps, onToggleStep }: Props) {
  const doneSteps = new Set(task.doneSteps ?? [])
  const hasSteps = !!task.steps && task.steps.length > 0
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)

  // Temps visual: comptador suau mentre estàs en focus.
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Tecla Escape per sortir.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function handleBreakdown() {
    setLoading(true)
    try {
      const { steps } = await breakdownTask(task.title)
      onSteps(steps)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Contenidor amb scroll: amb molts passos el contingut pot superar l'alçada de
    // la pantalla; min-h-full + justify-center centra quan hi cap i deixa fer scroll
    // (fins al botó "Fet") quan no hi cap.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-10 text-sm text-muted hover:text-ink transition-colors"
        aria-label="Tancar el mode focus"
      >
        Tanca ✕
      </button>

      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center animate-rise">

      {/* Cercle que respira: ancora visual de calma */}
      <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-sage-soft animate-breathe">
        <span className="font-mono text-lg text-sage-deep">{fmt(elapsed)}</span>
      </div>

      <p className="mb-2 text-sm uppercase tracking-widest text-muted">Ara mateix</p>
      <h1 className="mb-10 max-w-2xl text-3xl leading-snug font-medium text-ink sm:text-4xl">
        {task.title}
      </h1>

      {/* Micro-passos (si la IA ja els ha generat): clicables per marcar-los fets */}
      {hasSteps ? (
        <>
        <p className="mb-2 text-xs text-muted">Toca cada pas quan el completis</p>
        <ol className="mb-10 w-full max-w-md space-y-1 text-left">
          {task.steps!.map((step, i) => {
            const done = doneSteps.has(i)
            return (
              <li key={i}>
                <button
                  onClick={() => onToggleStep(i)}
                  aria-pressed={done}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-soft)] px-3 py-2 text-left transition hover:bg-sage-soft/60 ${
                    done ? 'opacity-60' : ''
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition ${
                      done
                        ? 'bg-sage text-white'
                        : 'border-2 border-sage/45 bg-transparent text-sage-deep'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span
                    className={`leading-snug transition ${
                      done ? 'text-muted line-through' : 'text-ink'
                    }`}
                  >
                    {step}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        </>
      ) : (
        <button
          onClick={handleBreakdown}
          disabled={loading}
          className="mb-10 rounded-full border border-line bg-surface px-6 py-3 text-ink shadow-sm transition hover:border-sage hover:text-sage-deep disabled:opacity-60"
        >
          {loading ? 'Pensant…' : 'No sé per on començar'}
        </button>
      )}

      <button
        onClick={onComplete}
        className="rounded-full bg-sage px-10 py-4 text-lg font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95"
      >
        Fet ✓
      </button>
      </div>
    </div>
  )
}
