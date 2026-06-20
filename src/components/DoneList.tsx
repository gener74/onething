import type { Task } from '../db'
import { useI18n, type Lang } from '../i18n'

interface Props {
  tasks: Task[]
  onClose: () => void
  onReopen: (id: number) => void
}

/** Etiqueta de dia humana: Avui / Ahir / data llarga (en l'idioma actiu). */
function dayLabel(ts: number | undefined, lang: Lang, t: (k: string) => string): string {
  if (!ts) return '—'
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOfDay(new Date()) - startOfDay(new Date(ts))) / 86_400_000)
  if (diff === 0) return t('day_today')
  if (diff === 1) return t('day_yesterday')
  return new Date(ts).toLocaleDateString(lang, { day: 'numeric', month: 'long' })
}

function timeLabel(ts: number | undefined, lang: Lang): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

export function DoneList({ tasks, onClose, onReopen }: Props) {
  const { t, lang } = useI18n()

  // Agrupar per dia. Les tasques arriben de més recent a més antiga.
  const groups: { label: string; items: Task[] }[] = []
  for (const task of tasks) {
    const label = dayLabel(task.completedAt, lang, t)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(task)
    else groups.push({ label, items: [task] })
  }

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
        <h1 className="mb-1 text-2xl font-medium tracking-tight text-ink">{t('done_title')}</h1>
        <p className="mb-8 text-sm text-muted">{t('done_subtitle')}</p>

        {tasks.length === 0 ? (
          <p className="py-16 text-center text-sm italic text-muted/70">{t('done_empty')}</p>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.label}>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                  {g.label}
                </h2>
                <ul className="space-y-2">
                  {g.items.map((task) => (
                    <li
                      key={task.id}
                      className="group flex items-center gap-3 rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage text-xs text-white">
                        ✓
                      </span>
                      <span className="flex-1 text-muted line-through">{task.title}</span>
                      <span className="text-xs text-muted/60">
                        {timeLabel(task.completedAt, lang)}
                      </span>
                      <button
                        onClick={() => onReopen(task.id)}
                        title={t('undo_title')}
                        className="text-xs text-muted transition hover:text-sage-deep [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                      >
                        {t('undo')}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
