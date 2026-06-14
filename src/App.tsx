import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  addTask,
  moveTask,
  completeTask,
  deleteTask,
  setSteps,
  isToday,
  exportTasks,
  importTasks,
  type Bucket,
  type Task,
} from './db'
import { FocusMode } from './components/FocusMode'

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'now', label: 'Ara' },
  { key: 'next', label: 'Després' },
  { key: 'someday', label: 'Algun dia' },
]

export default function App() {
  const [draft, setDraft] = useState('')
  const [focusId, setFocusId] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tasks = useLiveQuery(() => db.tasks.where('done').equals(0).toArray(), [])
  const completedToday = useLiveQuery(
    async () =>
      (await db.tasks.where('done').equals(1).toArray()).filter((t) =>
        isToday(t.completedAt),
      ).length,
    [],
  )

  const byBucket = useMemo(() => {
    const map: Record<Bucket, Task[]> = { now: [], next: [], someday: [] }
    for (const t of tasks ?? []) map[t.bucket].push(t)
    return map
  }, [tasks])

  const focusTask = (tasks ?? []).find((t) => t.id === focusId) ?? null

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    addTask(draft)
    setDraft('')
  }

  async function handleComplete(id: number) {
    await completeTask(id)
    setFocusId(null)
    setCelebrate(true)
    setTimeout(() => setCelebrate(false), 1600)
  }

  function flashNotice(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2600)
  }

  async function handleExport() {
    const data = await exportTasks()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `onething-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permet tornar a triar el mateix fitxer
    if (!file) return
    try {
      const n = await importTasks(JSON.parse(await file.text()))
      flashNotice(
        n === 0
          ? 'No hi havia tasques per importar.'
          : `${n} ${n === 1 ? 'tasca importada' : 'tasques importades'}.`,
      )
    } catch {
      flashNotice('No s’ha pogut importar aquest fitxer.')
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 pb-24">
      {/* Capçalera */}
      <header className="flex items-baseline justify-between pt-10 pb-6">
        <h1 className="text-2xl font-medium tracking-tight text-ink">onething</h1>
        <span className="text-sm text-muted">
          {completedToday
            ? `${completedToday} fet${completedToday === 1 ? '' : 'es'} avui`
            : 'comencem'}
        </span>
      </header>

      {/* Brain dump: sense fricció, un sol camp */}
      <form onSubmit={handleAdd} className="mb-8">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Què tens al cap? Escriu-ho i prem Enter…"
          aria-label="Afegir una cosa"
          className="w-full rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3.5 text-ink placeholder:text-muted/70 focus:border-sage focus:outline-none"
        />
      </form>

      {/* Els tres calaixos */}
      <div className="space-y-8">
        {BUCKETS.map(({ key, label }) => (
          <section key={key}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
              {label}
            </h2>
            {byBucket[key].length === 0 ? (
              <p className="text-sm text-muted/60 italic">Res aquí.</p>
            ) : (
              <ul className="space-y-2">
                {byBucket[key].map((t) => (
                  <li
                    key={t.id}
                    className="group flex items-center gap-2 rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3 animate-rise"
                  >
                    <span className="flex-1 text-ink">{t.title}</span>

                    {key === 'now' && (
                      <button
                        onClick={() => setFocusId(t.id)}
                        className="rounded-full bg-sage-soft px-3 py-1.5 text-sm text-sage-deep transition hover:bg-sage hover:text-white"
                      >
                        Comença
                      </button>
                    )}

                    <BucketMenu task={t} />

                    <button
                      onClick={() => deleteTask(t.id)}
                      aria-label="Esborrar"
                      className="text-muted/40 opacity-0 transition hover:text-ink group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Portabilitat discreta: emporta't les teves dades */}
      <footer className="mt-12 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-xs text-muted/70">
          <button onClick={handleExport} className="transition hover:text-ink">
            Exporta
          </button>
          <span aria-hidden>·</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="transition hover:text-ink"
          >
            Importa
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        {notice && <p className="text-sm text-sage-deep">{notice}</p>}
      </footer>

      {/* Mode focus */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          onClose={() => setFocusId(null)}
          onComplete={() => handleComplete(focusTask.id)}
          onSteps={(steps) => setSteps(focusTask.id, steps)}
        />
      )}

      {/* Recompensa */}
      {celebrate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-paper/80 backdrop-blur-sm animate-rise">
          <div className="text-center">
            <div className="mb-3 text-5xl">🌿</div>
            <p className="text-lg text-sage-deep">Una menys. Respira.</p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Botons discrets per moure una tasca entre calaixos. */
function BucketMenu({ task }: { task: Task }) {
  const targets = BUCKETS.filter((b) => b.key !== task.bucket)
  return (
    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
      {targets.map((b) => (
        <button
          key={b.key}
          onClick={() => moveTask(task.id, b.key)}
          title={`Mou a ${b.label}`}
          className="rounded-full px-2 py-1 text-xs text-muted transition hover:bg-sage-soft hover:text-sage-deep"
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
