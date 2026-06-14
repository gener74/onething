import { useEffect, useState } from 'react'
import type { Task } from '../db'
import { breakdownTask } from '../ai'

interface Props {
  task: Task
  onComplete: () => void
  onClose: () => void
  onSteps: (steps: string[]) => void
}

/** Format mm:ss */
function fmt(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function FocusMode({ task, onComplete, onClose, onSteps }: Props) {
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper px-6 text-center animate-rise">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-sm text-muted hover:text-ink transition-colors"
        aria-label="Tancar el mode focus"
      >
        Tanca ✕
      </button>

      {/* Cercle que respira: ancora visual de calma */}
      <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-sage-soft animate-breathe">
        <span className="font-mono text-lg text-sage-deep">{fmt(elapsed)}</span>
      </div>

      <p className="mb-2 text-sm uppercase tracking-widest text-muted">Ara mateix</p>
      <h1 className="mb-10 max-w-2xl text-3xl leading-snug font-medium text-ink sm:text-4xl">
        {task.title}
      </h1>

      {/* Micro-passos (si la IA ja els ha generat) */}
      {task.steps && task.steps.length > 0 ? (
        <ol className="mb-10 max-w-md space-y-3 text-left">
          {task.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-ink">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-soft text-xs text-sage-deep">
                {i + 1}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
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
  )
}
