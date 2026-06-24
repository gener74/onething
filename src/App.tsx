import { Fragment, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  addTask,
  moveTask,
  renameTask,
  completeTask,
  reopenTask,
  deleteTask,
  clearDone,
  setSteps,
  replaceStep,
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
import { Privacy } from './components/Privacy'
import { InstallHint } from './components/InstallHint'
import { Leaves } from './components/Leaves'
import { Mark } from './components/Mark'
import { useI18n, LANGS } from './i18n'

const BUCKETS: Bucket[] = ['now', 'next', 'someday']

export default function App() {
  const { t, tn } = useI18n()
  const [draft, setDraft] = useState('')
  const [focusId, setFocusId] = useState<number | null>(null)
  const [reward, setReward] = useState<string | null>(null)
  const [reflect, setReflect] = useState(false)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
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

  function showReward(key: string) {
    setReward(key)
    setTimeout(() => setReward(null), 1600)
  }

  // doReflect = ve d'una sessió de focus → preguntem "com et sents ara?" (reflexió
  // local, no s'envia enlloc). Completar des de la llista no ho pregunta.
  async function handleComplete(id: number, doReflect = false) {
    await completeTask(id)
    navigator.vibrate?.(15) // toc hàptic suau al mòbil (si el navegador ho suporta)
    setFocusId(null)
    if (doReflect) setReflect(true)
    else showReward('reward')
  }

  function answerReflect() {
    setReflect(false)
    showReward('feel_thanks')
  }

  // Treu la paràlisi de decisió: tria una tasca de "Ara" a l'atzar i entra-hi.
  function decideForMe() {
    const now = byBucket.now
    if (now.length === 0) return
    setFocusId(now[Math.floor(Math.random() * now.length)].id)
  }

  function startEdit(task: Task) {
    setEditingId(task.id)
    setEditDraft(task.title)
  }
  function saveEdit() {
    if (editingId !== null) renameTask(editingId, editDraft)
    setEditingId(null)
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
      flashNotice(n === 0 ? t('import_none') : tn('import_done', n))
    } catch {
      flashNotice(t('import_error'))
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 pb-24">
      {/* Capçalera */}
      <header className="flex items-center justify-between pt-10 pb-6">
        <div className="flex items-center gap-2.5">
          <Mark className="h-7 w-7" breathe />
          <h1 className="text-2xl font-medium tracking-tight text-ink">OneThing</h1>
        </div>
        <button
          onClick={() => setShowDone(true)}
          title={t('view_done')}
          aria-label={
            completedToday
              ? `${tn('done_today', completedToday)}. ${t('view_done')}`
              : t('view_done')
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
              <span className="ml-1.5 text-xs text-muted">{t('today_short')}</span>
            </>
          ) : (
            <span className="text-sm text-muted">{t('lets_start')}</span>
          )}
        </button>
      </header>

      {/* Brain dump: sense fricció, un sol camp + botó (Enter també funciona) */}
      <form onSubmit={handleAdd} className="mb-8 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('input_placeholder')}
          aria-label={t('add_aria')}
          className="min-w-0 flex-1 rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3.5 text-ink placeholder:text-muted/70 focus:border-sage focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={t('add')}
          className="shrink-0 rounded-[var(--radius-soft)] bg-sage px-5 py-3.5 font-medium text-white transition hover:bg-sage-deep disabled:bg-sage-soft disabled:text-sage-deep/50"
        >
          {t('add')}
        </button>
      </form>

      {/* Estat buit: benvinguda calmada en lloc de tres calaixos buits */}
      {!loaded ? null : isEmpty ? (
        <>
          <Leaves />
          <div className="relative flex flex-col items-center gap-6 py-20 text-center animate-rise">
            <Mark className="h-20 w-20" breathe />
            <div className="space-y-2">
              <p className="text-xl text-ink">{t('empty_title')}</p>
              <p className="mx-auto max-w-xs text-base text-sage-deep">{t('empty_motto')}</p>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted">
                {t('empty_hint')}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-10">
          {BUCKETS.map((key) => (
            <section key={key}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                  {t(`bucket_${key}`)}
                </h2>
                {key === 'now' && byBucket.now.length >= 2 && (
                  <button
                    onClick={decideForMe}
                    className="text-xs text-muted transition hover:text-sage-deep"
                  >
                    🎲 {t('decide')}
                  </button>
                )}
              </div>
              {byBucket[key].length === 0 ? (
                <p className="text-sm text-muted/60 italic">{t('nothing_here')}</p>
              ) : (
                <ul className="space-y-2">
                  {byBucket[key].map((task) => (
                    <li
                      key={task.id}
                      className="rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3 animate-rise"
                    >
                      {editingId === task.id ? (
                        <input
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              saveEdit()
                            } else if (e.key === 'Escape') {
                              setEditingId(null)
                            }
                          }}
                          autoFocus
                          className="w-full rounded-[var(--radius-soft)] border border-sage bg-surface px-2 py-1 text-ink focus:outline-none"
                        />
                      ) : (
                        <>
                          {/* El títol té la seva pròpia línia: sempre visible, mai
                              tallat (fa salt de línia si cal). */}
                          <p className="break-words leading-snug text-ink">{task.title}</p>

                          {/* Fila d'accions: Comença (només a Ara) és el botó principal;
                              a la dreta, completar i el menú ⋯ (mou/edita/esborra). */}
                          <div className="mt-2.5 flex items-center gap-2">
                            {key === 'now' && (
                              <button
                                onClick={() => setFocusId(task.id)}
                                className="rounded-full bg-sage px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sage-deep active:scale-95"
                              >
                                {/* Si ja hi ha micro-passos fets, és reprendre, no començar. */}
                                {(task.doneSteps?.length ?? 0) > 0 ? t('resume') : t('start')}
                              </button>
                            )}
                            <div className="ml-auto flex items-center gap-1.5">
                              <button
                                onClick={() => markDone(task.id)}
                                aria-label={t('mark_done')}
                                title={t('mark_done')}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
                                  completingId === task.id
                                    ? 'scale-110 border-sage bg-sage text-white'
                                    : 'border-sage/50 text-sage/60 hover:border-sage hover:bg-sage-soft hover:text-sage-deep'
                                }`}
                              >
                                ✓
                              </button>
                              <TaskMenu task={task} onEdit={() => startEdit(task)} />
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Portabilitat discreta + idioma */}
      <footer className="mt-12 flex flex-col items-center gap-2 text-center">
        <p className="max-w-xs text-xs text-muted/70">{t('data_local')}</p>
        <div className="flex items-center gap-3 text-xs text-muted/70">
          <button
            onClick={handleExport}
            title={t('save_copy_title')}
            className="transition hover:text-ink"
          >
            {t('save_copy')}
          </button>
          <span aria-hidden>·</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            title={t('recover_title')}
            className="transition hover:text-ink"
          >
            {t('recover')}
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
        <div className="flex items-center gap-4">
          <LangSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted/60">
          <button onClick={() => setShowPrivacy(true)} className="transition hover:text-ink">
            {t('privacy')}
          </button>
          <span aria-hidden>·</span>
          <a
            href="mailto:eduard@queralto.cat?subject=OneThing"
            className="transition hover:text-ink"
          >
            {t('feedback')}
          </a>
        </div>
        <p className="text-[11px] text-muted/50">Ward Technologies Inc.</p>
      </footer>

      {/* Mode focus */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          onClose={() => setFocusId(null)}
          onComplete={() => handleComplete(focusTask.id, true)}
          onSteps={(steps) => setSteps(focusTask.id, steps)}
          onReplaceStep={(index, smaller) => replaceStep(focusTask.id, index, smaller)}
          onMinutes={(minutes) => setFocusMinutes(focusTask.id, minutes)}
          onToggleStep={(index) => toggleStep(focusTask.id, index)}
          onCaptureNext={(title) => addTask(title, 'next')}
        />
      )}

      {/* Panell de tasques fetes */}
      {showDone && (
        <DoneList
          tasks={doneTasks ?? []}
          onClose={() => setShowDone(false)}
          onReopen={(id) => reopenTask(id)}
          onDelete={(id) => deleteTask(id)}
          onClearAll={() => clearDone()}
        />
      )}

      {/* Nota de privacitat */}
      {showPrivacy && <Privacy onClose={() => setShowPrivacy(false)} />}

      {/* Reflexió final d'una sessió de focus: com et sents ara? (local) */}
      {reflect && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-paper/95 px-6 text-center animate-rise">
          <p className="mb-8 text-xl font-medium text-ink">{t('feel_now_q')}</p>
          <div className="flex w-full max-w-xs flex-col gap-2.5">
            {(['feel_better', 'feel_same', 'feel_worse'] as const).map((k) => (
              <button
                key={k}
                onClick={answerReflect}
                className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
              >
                {t(k)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recompensa */}
      {reward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-paper/80 backdrop-blur-sm animate-rise">
          <div className="text-center">
            <div className="mb-3 text-5xl">🌿</div>
            <p className="text-lg text-sage-deep">{t(reward)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Menú ⋯ d'accions secundàries d'una tasca: editar, moure-la de calaix i
 * esborrar-la. Plegar-les aquí allibera la fila perquè el títol i el botó
 * "Comença" respirin (igual a escriptori que a mòbil). Es tanca tocant fora.
 */
function TaskMenu({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const targets = BUCKETS.filter((b) => b !== task.bucket)
  const item =
    'block w-full px-4 py-2.5 text-left text-sm text-ink transition hover:bg-sage-soft hover:text-sage-deep'
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('more_actions')}
        title={t('more_actions')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted/60 transition hover:bg-sage-soft hover:text-sage-deep"
      >
        ⋯
      </button>
      {open && (
        <>
          {/* Rerefons invisible: tocar fora tanca el menú (també al mòbil) */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-[var(--radius-soft)] border border-line bg-surface py-1 shadow-lg"
          >
            <button role="menuitem" onClick={() => { onEdit(); setOpen(false) }} className={item}>
              {t('edit')}
            </button>
            {targets.map((b) => (
              <button
                key={b}
                role="menuitem"
                onClick={() => { moveTask(task.id, b); setOpen(false) }}
                className={item}
              >
                {t('move_to', { label: t(`bucket_${b}`) })}
              </button>
            ))}
            <button
              role="menuitem"
              onClick={() => { deleteTask(task.id); setOpen(false) }}
              className="block w-full px-4 py-2.5 text-left text-sm text-muted transition hover:bg-sage-soft hover:text-ink"
            >
              {t('delete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Selector de tema discret (☀️ clar · 🌙 fosc), amb l'actiu ressaltat. */
function ThemeToggle() {
  const { t } = useI18n()
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )
  function set(next: boolean) {
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('onething-theme', next ? 'dark' : 'light')
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px]" aria-label={t('theme_toggle')}>
      <button
        onClick={() => set(false)}
        aria-pressed={!dark}
        title={t('theme_light')}
        className={`leading-none transition hover:opacity-100 ${dark ? 'opacity-40' : 'opacity-100'}`}
      >
        ☀️
      </button>
      <span aria-hidden className="text-muted/40">
        ·
      </span>
      <button
        onClick={() => set(true)}
        aria-pressed={dark}
        title={t('theme_dark')}
        className={`leading-none transition hover:opacity-100 ${dark ? 'opacity-100' : 'opacity-40'}`}
      >
        🌙
      </button>
    </div>
  )
}

/** Selector d'idioma discret (EN · CA · ES). */
function LangSwitcher() {
  const { lang, setLang } = useI18n()
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted/60">
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
  )
}
