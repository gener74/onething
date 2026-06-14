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

export async function breakdownTask(title: string): Promise<Breakdown> {
  try {
    const res = await fetch('/api/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
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
  return { steps: heuristicBreakdown(title), fromAI: false }
}

/**
 * Fallback local: no és intel·ligent, però dóna una empenta inicial coherent
 * mentre no tinguem la IA real connectada.
 */
function heuristicBreakdown(title: string): string[] {
  const t = title.trim().replace(/\.$/, '')
  return [
    `Obre o prepara el que necessites per a: "${t}" (només això).`,
    'Fes-ne la part més petita possible durant 2 minuts.',
    'Quan portis 2 minuts, decideix si continues o pares.',
  ]
}
