/**
 * Killer feature: partir una tasca que paralitza en un primer micro-pas
 * ridículament petit (de 2 minuts).
 *
 * Arquitectura: el client crida una funció serverless (`/api/breakdown`) que
 * amaga la clau de Claude. Si encara no està desplegada (p. ex. en local sense
 * clau), caiem a un fallback heurístic perquè la UX funcioni igualment.
 *
 * PENDENT (pròxim pas): implementar /api/breakdown amb l'API de Claude.
 */

export interface Breakdown {
  steps: string[]
  /** true si ve de la IA real; false si és el fallback local. */
  fromAI: boolean
  /** Quants desglossaments d'IA porta avui aquest dispositiu, i el límit diari. */
  used?: number
  limit?: number
  /** true si s'ha arribat al límit diari (i per això surt el fallback). */
  limited?: boolean
}

/** Com se sent l'usuari davant la tasca (context per ajustar to i mida del pas). */
export type Feeling = 'clar' | 'mandra' | 'bloquejat' | 'ansietat'

/** Context opcional que millora el desglossament: emoció + temps + idioma. */
export interface BreakdownContext {
  feeling?: Feeling
  minutes?: number
  lang?: 'en' | 'ca' | 'es'
  /** L'usuari troba el pas massa gran → demana passos encara més petits. */
  simpler?: boolean
}

/**
 * Id anònim i estable d'aquest dispositiu (no és un compte ni cap dada personal):
 * només serveix perquè el servidor compti la ració diària gratuïta per dispositiu.
 */
function deviceId(): string {
  const KEY = 'onething-device'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

/**
 * Interruptor NOMÉS de desenvolupament: obrir l'app amb `?simlimit=1` força la
 * pantalla de "límit diari assolit" per poder-la provar sense esgotar la quota
 * real. `import.meta.env.DEV` és `false` en producció → aquest codi s'elimina del
 * build (no és cap porta del darrere en producció).
 */
function simulatesLimit(): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get('simlimit') === '1'
  )
}

export async function breakdownTask(
  title: string,
  ctx: BreakdownContext = {},
): Promise<Breakdown> {
  if (simulatesLimit()) {
    return { steps: heuristicBreakdown(title, ctx), fromAI: false, limited: true }
  }
  try {
    const res = await fetch('/api/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        feeling: ctx.feeling,
        minutes: ctx.minutes,
        lang: ctx.lang,
        simpler: ctx.simpler,
        device: deviceId(),
      }),
    })
    const data = (await res.json().catch(() => null)) as {
      steps?: string[]
      used?: number
      limit?: number
      error?: string
    } | null

    if (res.ok && data && Array.isArray(data.steps) && data.steps.length > 0) {
      return {
        steps: data.steps.map(String),
        fromAI: true,
        used: data.used,
        limit: data.limit,
      }
    }
    // Límit diari assolit → fallback, però marcat perquè la UI ho expliqui amablement.
    if (res.status === 429 && data?.error === 'quota_exceeded') {
      return {
        steps: heuristicBreakdown(title, ctx),
        fromAI: false,
        limited: true,
        limit: data.limit,
      }
    }
  } catch {
    // sense xarxa o endpoint no disponible → fallback
  }
  return { steps: heuristicBreakdown(title, ctx), fromAI: false }
}

/**
 * Mètrica mínima i ANÒNIMA (embut): avisa el servidor d'una fita anònima de la
 * sessió —s'ha entrat des de la landing (`entered`), s'ha capturat la primera
 * tasca (`captured`), s'ha mostrat un desglossament (`shown`), s'ha fet el
 * primer pas (`started`) o un usuari que JA tenia tasques ha tornat en una
 * sessió nova (`returned` → senyal de retenció, la pregunta que ens fèiem).
 * NO envia cap contingut ni cap identificador —només un "+1" global— i és
 * best-effort: si falla o no hi ha endpoint (Vite sol), s'ignora en silenci.
 * `keepalive` perquè el ping sobrevisqui encara que es tanqui la pantalla.
 */
export function pingEvent(
  name: 'entered' | 'captured' | 'shown' | 'started' | 'returned',
): void {
  try {
    void fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // mai trenquem la UX per una mètrica
  }
}

/**
 * Fallback local: no és intel·ligent, però dóna una empenta inicial coherent
 * mentre no tinguem la IA real connectada. En l'idioma de l'usuari i amb el temps triat.
 */
function heuristicBreakdown(title: string, ctx: BreakdownContext = {}): string[] {
  const t = title.trim().replace(/\.$/, '')
  const lang = ctx.lang ?? 'en'
  const m = ctx.minutes && ctx.minutes > 0 ? ctx.minutes : 0

  const dur = {
    en: m > 0 ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : 'a short while',
    ca: m > 0 ? `${m} ${m === 1 ? 'minut' : 'minuts'}` : 'una estona curta',
    es: m > 0 ? `${m} ${m === 1 ? 'minuto' : 'minutos'}` : 'un rato corto',
  }[lang]

  const build = {
    en: (d: string) => [
      `Open or get out what you need for: "${t}" (just that).`,
      `Do the smallest possible part for ${d}.`,
      `After ${d}, decide whether to continue or stop.`,
    ],
    ca: (d: string) => [
      `Obre o prepara el que necessites per a: "${t}" (només això).`,
      `Fes-ne la part més petita possible durant ${d}.`,
      `Quan portis ${d}, decideix si continues o pares.`,
    ],
    es: (d: string) => [
      `Abre o prepara lo que necesitas para: "${t}" (solo eso).`,
      `Haz la parte más pequeña posible durante ${d}.`,
      `Cuando lleves ${d}, decide si continúas o paras.`,
    ],
  }[lang]

  return build(dur)
}
