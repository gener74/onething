import { useEffect, useRef, useState } from 'react'
import type { Task } from '../db'
import { breakdownTask, pingEvent, type Feeling } from '../ai'
import { useI18n } from '../i18n'
import { Leaves } from './Leaves'

interface Props {
  task: Task
  onClose: () => void
  onComplete: () => void
  onSteps: (steps: string[]) => void
  onReplaceStep: (index: number, smaller: string[]) => void
  onToggleStep: (index: number) => void
  onMinutes: (minutes: number) => void
  onCaptureNext: (title: string) => void
}

const FEELINGS: Feeling[] = ['clar', 'mandra', 'bloquejat', 'ansietat']

// Geometria de l'anell de progrés del focus (radi i circumferència, en px).
const RING_R = 60
const RING_C = 2 * Math.PI * RING_R

// 0 = sense límit (cap compte enrere ni check-in).
const TIMES = [2, 5, 15, 30, 0]

// Quantes vegades es pot demanar "Massa gran" en una sessió (evita l'espiral infinita).
const MAX_SIMPLER = 2

export function FocusMode({
  task,
  onClose,
  onComplete,
  onSteps,
  onReplaceStep,
  onToggleStep,
  onMinutes,
  onCaptureNext,
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
  // Comiat amable en deixar-ho a mitges (surt quan ja has començat, sense culpa).
  const [leaving, setLeaving] = useState(false)
  // Quota diària de la IA: si s'ha arribat al límit i quants en queden avui.
  const [aiLimited, setAiLimited] = useState(false)
  const [aiRemaining, setAiRemaining] = useState<number | null>(null)
  // Quantes vegades s'ha demanat "Massa gran" en aquesta sessió.
  const [simplerCount, setSimplerCount] = useState(0)
  // "Anota la següent cosa": capturar la propera acció d'un projecte sense
  // sortir a mà al brain dump. capturing = camp obert; captured = confirmació.
  const [capturing, setCapturing] = useState(false)
  const [nextDraft, setNextDraft] = useState('')
  const [captured, setCaptured] = useState(false)
  // started-rate net: comptem "shown" UN COP per sessió de focus (aquest muntatge),
  // no a cada desglossament. Regenerar no ha d'inflar el denominador.
  const shownPinged = useRef(false)

  // El primer pas pendent és el nostre "únic objectiu ara". Mai ensenyem la
  // llista sencera: una sola cosa a la vegada (menys càrrega cognitiva).
  const currentIndex = hasSteps ? steps.findIndex((_, i) => !doneSteps.has(i)) : -1
  const showStep = currentIndex !== -1
  const isLastPending = doneSteps.size === steps.length - 1
  // Tots els passos fets: no auto-completem; preguntem si la tasca ja està acabada.
  const allDone = hasSteps && currentIndex === -1

  // En REPRENDRE una tasca que ja té passos pendents, tornem a preguntar quant
  // de temps et dónes ara (cada sessió ho decideixes de nou) abans de mostrar el
  // pas. Es decideix només al muntar: un cop tries el temps, deixem de preguntar.
  const [askTime, setAskTime] = useState(() => hasSteps && currentIndex !== -1)

  // El temps que t'has donat NO es mostra amb xifres (un rellotge que baixa
  // pressiona). En comptes d'això, un anell de progrés es buida suaument, i quan
  // s'esgota apareix sol el check-in.
  const total = (task.focusMinutes ?? 0) * 60
  // !askTime: mentre encara tries el temps (Resume) el rellotge no compta, per
  // no disparar el check-in per sobre del selector.
  const timeUp = showStep && !askTime && total > 0 && elapsed >= total
  // Fracció del temps triat ja transcorregut (0→1) per pintar l'anell.
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0
  // L'anell només té sentit quan estàs en un pas amb temps: no mentre tries el
  // temps (Resume) ni mentre la IA pensa.
  const showRing = total > 0 && showStep && !askTime && !loading

  // El temps només corre quan estàs de debò en un pas: no mentre la IA pensa
  // (p. ex. "Massa gran" no et menja minuts) ni mentre tries el temps al Resume.
  useEffect(() => {
    if (!showStep || loading || askTime) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [showStep, loading, askTime])

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
    // Mètrica anònima: aquesta sessió ha ARRENCAT (primer pas fet). Sense contingut.
    if (wasFirst) pingEvent('started')
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
    setSimplerCount(0)
    setAskTime(false)
  }

  // Reprendre: ja hi ha passos, només fixem el temps triat i mostrem el pas
  // (sense tornar a cridar la IA).
  function resumeWithTime(minutes: number) {
    onMinutes(minutes)
    setElapsed(0)
    setAskTime(false)
  }

  // "Anota la següent cosa": desa la propera acció concreta al calaix Després
  // (no completem el projecte; només capturem perquè no es perdi) i sortim amb
  // una confirmació breu.
  function captureNext() {
    const text = nextDraft.trim()
    if (!text) return
    onCaptureNext(text)
    setNextDraft('')
    setCapturing(false)
    setCaptured(true)
    setTimeout(onClose, 1600)
  }

  // "Ho deixo per ara": surt amb un comiat amable. El progrés ja està desat
  // (la tasca queda al calaix amb els passos fets), així que reprendre és directe.
  function leaveForNow() {
    setLeaving(true)
    setTimeout(onClose, 1600)
  }

  // "Massa gran": parteix el pas actual en passos encara més petits (amb límit).
  async function makeSmaller() {
    if (simplerCount >= MAX_SIMPLER || currentIndex === -1) return
    setLoading(true)
    try {
      const { steps: smaller, limited, used, limit } = await breakdownTask(
        steps[currentIndex],
        {
          feeling: feeling ?? undefined,
          minutes: task.focusMinutes || undefined,
          lang,
          simpler: true,
        },
      )
      // Encaixem els sub-passos al lloc del pas actual i conservem el progrés
      // (els passos ja fets i els posteriors no es perden).
      onReplaceStep(currentIndex, smaller)
      setSimplerCount((c) => c + 1)
      setAiLimited(!!limited)
      setAiRemaining(
        limit != null && used != null ? Math.max(limit - used, 0) : null,
      )
    } finally {
      setLoading(false)
    }
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
      // Mètrica anònima: s'ha mostrat un desglossament (denominador del started-rate).
      // Només el primer d'aquesta sessió: regenerar no ha de comptar de nou.
      if (!shownPinged.current) {
        pingEvent('shown')
        shownPinged.current = true
      }
      setSimplerCount(0)
      setAiLimited(!!limited)
      setAiRemaining(
        limit != null && used != null ? Math.max(limit - used, 0) : null,
      )
    } finally {
      setLoading(false)
    }
  }

  const timeLabel = (m: number) => (m === 0 ? t('no_limit') : tn('minutes', m))

  // Pantalla "Quant temps tens?": compartida pel flux de tasca nova (després de
  // "com et sents", crida la IA) i per la represa (només fixa el temps).
  const timeScreen = (onPick: (m: number) => void, onBack: () => void) => (
    <>
      <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
      <h1 className="mb-8 text-2xl font-medium text-ink sm:text-3xl">{t('time_q')}</h1>
      <div className="flex w-full max-w-xs flex-col gap-2.5">
        {TIMES.map((m) => (
          <button
            key={m}
            onClick={() => onPick(m)}
            className="rounded-[var(--radius-soft)] border border-line bg-surface px-5 py-3.5 text-ink transition hover:border-sage hover:text-sage-deep"
          >
            {timeLabel(m)}
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        className="mt-8 text-sm text-muted transition hover:text-ink"
      >
        {t('back')}
      </button>
    </>
  )

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

      {/* Cercle de focus: un anell de sàlvia mostra el temps que t'has donat (s'omple
          suaument de buit a ple, sense xifres → calma, no pressió). Al centre, el
          cercle que respira amb l'àncora; mentre la IA pensa, tres punts que palpiten. */}
      <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
        {showRing && (
          <svg
            className="pointer-events-none absolute inset-0 -rotate-90"
            viewBox="0 0 128 128"
            aria-hidden
          >
            {/* Pista de fons: l'anell "sencer" */}
            <circle
              cx="64"
              cy="64"
              r={RING_R}
              fill="none"
              strokeWidth="3"
              style={{ stroke: 'var(--color-sage-soft)' }}
            />
            {/* Progrés: s'OMPLE de buit a ple mentre passa el temps triat (metàfora
                positiva —avances— en comptes de "se't gasta el temps"). */}
            <circle
              cx="64"
              cy="64"
              r={RING_R}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                stroke: 'var(--color-sage-deep)',
                strokeDasharray: RING_C,
                strokeDashoffset: RING_C * (1 - progress),
                transition: 'stroke-dashoffset 1s linear',
              }}
            />
          </svg>
        )}
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-sage-soft animate-breathe">
          {loading ? (
            /* Només mentre la IA pensa: tres punts que palpiten (indicador de càrrega). */
            <span className="flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-sage animate-pulse-soft"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden />
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-lg text-muted">{t('thinking')}</p>
      ) : askTime ? (
        /* Reprenent una tasca: tornem a triar quant de temps ens donem ara */
        timeScreen(resumeWithTime, onClose)
      ) : allDone ? (
        /* Tots els passos fets: tu decideixes si la tasca està acabada, continues
           o anotes la següent cosa (útil quan era un projecte i el procés segueix) */
        <>
          <p className="mb-3 max-w-xs truncate text-xs text-muted/70">{task.title}</p>
          {capturing ? (
            <>
              <p className="mb-6 max-w-sm text-xl font-medium leading-snug text-ink">
                {t('capture_next')}
              </p>
              <input
                value={nextDraft}
                onChange={(e) => setNextDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    captureNext()
                  }
                }}
                placeholder={t('capture_next_ph')}
                aria-label={t('capture_next')}
                autoFocus
                className="w-full max-w-xs rounded-[var(--radius-soft)] border border-line bg-surface px-4 py-3.5 text-center text-ink placeholder:text-muted/70 focus:border-sage focus:outline-none"
              />
              <div className="mt-4 flex w-full max-w-xs flex-col gap-2.5">
                <button
                  onClick={captureNext}
                  disabled={!nextDraft.trim()}
                  className="rounded-full bg-sage px-8 py-3.5 font-medium text-white shadow-md transition hover:bg-sage-deep active:scale-95 disabled:bg-sage-soft disabled:text-sage-deep/50"
                >
                  {t('capture_next_save')}
                </button>
                <button
                  onClick={() => {
                    setCapturing(false)
                    setNextDraft('')
                  }}
                  className="text-sm text-muted transition hover:text-ink"
                >
                  {t('back')}
                </button>
              </div>
            </>
          ) : (
            <>
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
              <button
                onClick={() => setCapturing(true)}
                className="mt-6 text-sm text-muted/80 transition hover:text-sage-deep"
              >
                {t('capture_next')}
              </button>
            </>
          )}
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
            <p className="mb-5 max-w-xs rounded-[var(--radius-soft)] bg-sage-soft px-4 py-3 text-sm leading-relaxed text-sage-deep">
              <span aria-hidden className="mr-1.5">🌙</span>
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

          {simplerCount < MAX_SIMPLER && (
            <button
              onClick={makeSmaller}
              className="mt-4 rounded-full border border-line bg-surface px-5 py-2 text-sm text-muted transition hover:border-sage hover:text-sage-deep"
            >
              {t('too_big')}
            </button>
          )}

          <button
            onClick={regenerate}
            className="mt-4 text-sm text-muted transition hover:text-ink"
          >
            {t('regen')}
          </button>

          {/* Sortida digna: deixar-ho a mitges no és fracàs */}
          <button
            onClick={leaveForNow}
            className="mt-6 text-sm text-muted/70 transition hover:text-ink"
          >
            {t('leave_for_now')}
          </button>
        </>
      ) : phase === 'time' ? (
        /* Pantalla "Quant temps tens?": acota el primer pas */
        timeScreen(startBreakdown, () => setPhase('feeling'))
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
            <>
              <p className="mb-6 max-w-sm text-lg leading-relaxed text-sage-deep">
                {t('distracted_msg')}
              </p>
              {currentIndex !== -1 && (
                <>
                  <p className="mb-2 text-sm uppercase tracking-widest text-muted">
                    {t('your_goal')}
                  </p>
                  <p className="max-w-md text-xl font-medium leading-snug text-ink">
                    {steps[currentIndex]}
                  </p>
                </>
              )}
            </>
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

      {/* Confirmació breu en anotar la següent cosa: on la trobaràs */}
      {captured && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-paper/90 px-6 text-center backdrop-blur-sm animate-rise">
          <p className="max-w-sm text-xl font-medium leading-snug text-sage-deep">
            {t('captured_msg', { bucket: t('bucket_next') })}
          </p>
        </div>
      )}

      {/* Comiat amable en deixar-ho per ara: reconeix el progrés si n'hi ha */}
      {leaving && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-paper/90 px-6 text-center backdrop-blur-sm animate-rise">
          <p className="max-w-sm text-xl font-medium leading-snug text-sage-deep">
            {doneSteps.size > 0 ? t('leaving_progress') : t('leaving_fresh')}
          </p>
        </div>
      )}
    </div>
  )
}
