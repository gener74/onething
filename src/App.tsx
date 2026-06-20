import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  addTask,
  moveTask,
  completeTask,
  reopenTask,
  deleteTask,
  setSteps,
  setFocusMinutes,
  toggleStep,
  isToday,
  exportTasks,
  importTasks,
  type Bucket,
  type Task,
} from './db'
import { FocusMode } from './components/FocusMode'
import { DoneList } from './components/DoneList'
import { InstallHint } from './components/InstallHint'
import { Mark } from './components/Mark'

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'now', label: 'Ara' },
  { key: 'next', label: 'Després' },
  { key: 'someday', label: 'Algun dia' },
]

export default function App() {
  const [draft, setDraft] = useState('')
  const [focusId, setFocusId] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [showDone, setShowDone] = useState(false)
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
  // Historial de fetes, de més recent a més antiga (per al panell "Fetes").
  const doneTasks = useLiveQuery(async () => {
    const arr = await db.tasks.where('done').equals(1).sortBy('completedAt')
    return arr.reverse()
  }, [])

  const byBucket = useMemo(() => {
    const map: Record<Bucket, Task[]> = { now: [], next: [], someday: [] }
    for (const t of tasks ?? []) map[t.bucket].push(t)
    return map
  }, [tasks])

  const focusTask = (tasks ?? []).find((t) => t.id === focusId) ?? null
  const loaded = tasks !== undefined
  const isEmpty = loaded && (tasks?.length ?? 0) === 0

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

  // Marcar feta des de la llista: omple el cercle un instant (feedback clar, també
  // al mòbil) abans de completar i mostrar la recompensa.
  function markDone(id: number) {
    setCompletingId(id)
    setTimeout(() => {
      handleComplete(id)
      setCompletingId(null)
    }, 220)
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
      <header className="flex items-center justify-between pt-10 pb-6">
        <div className="flex items-center gap-2.5">
          <Mark className="h-7 w-7" breathe />
          <h1 className="text-2xl font-medium tracking-tight text-ink">Onething</h1>
        </div>
        <button
          onClick={() => setShowDone(true)}
          title="Veure les tasques fetes"
          aria-label={
            completedToday
              ? `${completedToday} ${completedToday === 1 ? 'feta' : 'fetes'} avui. Veure les fetes.`
              : 'Veure les tasques fetes'
          }
          className="flex items-center gap-1 rounded-full px-1 transition hover:opacity-70"
        >
          {completedToday ? (
            <>
              {Array.from({ length: Math.min(completedToday, 7) }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-sage animate-rise" />
              ))}
              {completedToday > 7 && (
                <span className="ml-0.5 text-xs text-muted">+{completedToday - 7}</span>
              )}
              <span className="ml-1.5 text-xs text-muted">avui</span>
            </>
          ) : (
            <span className="text-sm text-muted">comencem</span>
          )}
        </button>
      </header>

      {/* Brain dump: sense fricció, un sol camp + botó (Enter també funciona) */}
      <form onSubmit={handleAdd} className="mb-8 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Què tens al cap?…"
          aria-label="Afegir una cosa"
          className="min-w-0 flex-1 rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3.5 text-ink placeholder:text-muted/70 focus:border-sage focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Afegir"
          className="shrink-0 rounded-[var(--radius-soft)] bg-sage px-5 py-3.5 font-medium text-white transition hover:bg-sage-deep disabled:bg-sage-soft disabled:text-sage-deep/50"
        >
          Afegir
        </button>
      </form>

      {/* Estat buit: benvinguda calmada en lloc de tres calaixos buits */}
      {!loaded ? null : isEmpty ? (
        <div className="flex flex-col items-center gap-6 py-16 text-center animate-rise">
          <Mark className="h-20 w-20" breathe />
          <div className="space-y-1.5">
            <p className="text-lg text-ink">Una cosa a la vegada.</p>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted">
              Escriu què tens al cap aquí dalt i afegeix-ho. La resta pot esperar.
            </p>
          </div>
        </div>
      ) : (
      <div className="space-y-10">
        {BUCKETS.map(({ key, label }) => (
          <section key={key}>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">
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
                    <button
                      onClick={() => markDone(t.id)}
                      aria-label="Marcar com a feta"
                      title="Marcar com a feta"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
                        completingId === t.id
                          ? 'scale-110 border-sage bg-sage text-white'
                          : 'border-sage/40 text-transparent hover:border-sage hover:text-sage/70'
                      }`}
                    >
                      ✓
                    </button>
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
                      className="text-muted/40 transition hover:text-ink [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
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
      )}

      {/* Portabilitat discreta: emporta't les teves dades */}
      <footer className="mt-12 flex flex-col items-center gap-2 text-center">
        <p className="max-w-xs text-xs text-muted/70">
          Les teves dades viuen només en aquest dispositiu.
        </p>
        <div className="flex items-center gap-3 text-xs text-muted/70">
          <button
            onClick={handleExport}
            title="Baixa un fitxer amb totes les teves tasques, per guardar-lo o passar-lo a un altre dispositiu"
            className="transition hover:text-ink"
          >
            Desa una còpia
          </button>
          <span aria-hidden>·</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Recupera les tasques des d'un fitxer que havies desat"
            className="transition hover:text-ink"
          >
            Recupera
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
        <InstallHint />
        <p className="mt-1 text-[11px] text-muted/50">Ward Technologies Inc.</p>
      </footer>

      {/* Mode focus */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          onClose={() => setFocusId(null)}
          onSteps={(steps) => setSteps(focusTask.id, steps)}
          onMinutes={(minutes) => setFocusMinutes(focusTask.id, minutes)}
          onToggleStep={async (index) => {
            const t = focusTask
            const total = t.steps?.length ?? 0
            const current = new Set(t.doneSteps ?? [])
            const willBeDone = !current.has(index)
            const newCount = willBeDone ? current.size + 1 : current.size - 1
            await toggleStep(t.id, index)
            // En marcar l'últim pas pendent, completem la tasca automàticament.
            if (willBeDone && total > 0 && newCount === total) {
              handleComplete(t.id)
            }
          }}
        />
      )}

      {/* Panell de tasques fetes */}
      {showDone && (
        <DoneList
          tasks={doneTasks ?? []}
          onClose={() => setShowDone(false)}
          onReopen={(id) => reopenTask(id)}
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
    <div className="flex gap-1 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
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
