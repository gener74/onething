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
}

/** Com se sent l'usuari davant la tasca (context per ajustar to i mida del pas). */
export type Feeling = 'clar' | 'mandra' | 'bloquejat' | 'ansietat'

/** Context opcional que millora el desglossament: emoció + temps disponible. */
export interface BreakdownContext {
  feeling?: Feeling
  minutes?: number
}

export async function breakdownTask(
  title: string,
  ctx: BreakdownContext = {},
): Promise<Breakdown> {
  try {
    const res = await fetch('/api/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, feeling: ctx.feeling, minutes: ctx.minutes }),
    })
    if (res.ok) {
      const data = (await res.json()) as { steps?: string[] }
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        return { steps: data.steps.map(String), fromAI: true }
      }
    }
  } catch {
    // sense xarxa o endpoint no disponible → fallback
  }
  return { steps: heuristicBreakdown(title, ctx), fromAI: false }
}

/**
 * Fallback local: no és intel·ligent, però dóna una empenta inicial coherent
 * mentre no tinguem la IA real connectada. Fa servir el temps triat si n'hi ha.
 */
function heuristicBreakdown(title: string, ctx: BreakdownContext = {}): string[] {
  const t = title.trim().replace(/\.$/, '')
  const m = ctx.minutes && ctx.minutes > 0 ? ctx.minutes : 0
  const dur = m > 0 ? `${m} ${m === 1 ? 'minut' : 'minuts'}` : 'una estona curta'
  return [
    `Obre o prepara el que necessites per a: "${t}" (només això).`,
    `Fes-ne la part més petita possible durant ${dur}.`,
    `Quan portis ${dur}, decideix si continues o pares.`,
  ]
}
