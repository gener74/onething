import Dexie, { type EntityTable } from 'dexie'

/**
 * Capa de dades 100% local (IndexedDB via Dexie).
 * Cap dada surt del dispositiu → sense backend, sense comptes, sense RGPD.
 */

export type Bucket = 'now' | 'next' | 'someday'

export interface Task {
  id: number
  title: string
  bucket: Bucket
  /** Micro-passos generats per la IA ("no sé per on començar"). */
  steps?: string[]
  /** Índexs dels micro-passos ja marcats com a fets (recompensa pas a pas). */
  doneSteps?: number[]
  /** 0 = pendent, 1 = feta. (IndexedDB no pot indexar booleans.) */
  done: 0 | 1
  createdAt: number
  completedAt?: number
}

// El nom de la BD es manté 'una' (la marca original) a propòsit: canviar-lo
// orfenaria les dades locals ja existents. És un identificador intern i invisible.
const db = new Dexie('una') as Dexie & {
  tasks: EntityTable<Task, 'id'>
}

db.version(1).stores({
  // ++id = clau autoincremental; la resta són índexs per consultar
  tasks: '++id, bucket, done, createdAt, completedAt',
})

export { db }

/**
 * Demana al navegador que protegeixi les dades del desallotjament automàtic.
 * Com que la BD local és l'ÚNICA còpia de les tasques (no hi ha backend), és la
 * nostra xarxa de seguretat: passa l'origen de "best-effort" a "persistent".
 * No bloqueja res ni demana res si el navegador no ho suporta.
 */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return
  // Si ja està concedit, no cal tornar-ho a demanar (alguns navegadors preguntarien).
  if (await navigator.storage.persisted()) return
  await navigator.storage.persist()
}

// --- Operacions ---

export function addTask(title: string, bucket: Bucket = 'now') {
  const clean = title.trim()
  if (!clean) return
  return db.tasks.add({
    title: clean,
    bucket,
    done: 0,
    createdAt: Date.now(),
  } as Task)
}

export function moveTask(id: number, bucket: Bucket) {
  return db.tasks.update(id, { bucket })
}

export function setSteps(id: number, steps: string[]) {
  // Passos nous → reinicia els marcats (els índexs antics ja no hi corresponen).
  return db.tasks.update(id, { steps, doneSteps: [] })
}

/** Marca/desmarca un micro-pas pel seu índex. */
export function toggleStep(id: number, index: number) {
  return db.transaction('rw', db.tasks, async () => {
    const t = await db.tasks.get(id)
    if (!t) return
    const set = new Set(t.doneSteps ?? [])
    if (set.has(index)) set.delete(index)
    else set.add(index)
    await db.tasks.update(id, { doneSteps: [...set].sort((a, b) => a - b) })
  })
}

export function completeTask(id: number) {
  return db.tasks.update(id, { done: 1, completedAt: Date.now() })
}

export function deleteTask(id: number) {
  return db.tasks.delete(id)
}

/** Quantes tasques he completat avui (per a la recompensa/ratxa). */
export function isToday(ts?: number) {
  if (!ts) return false
  const d = new Date(ts)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

// --- Export / Import ---
//
// Portabilitat honesta: l'usuari es baixa un fitxer JSON i se l'emporta on vulgui.
// Cap dada surt sola del dispositiu; només si l'usuari exporta a posta. Sense
// backend ni comptes → no trenquem la garantia local-first.

const EXPORT_VERSION = 1

export interface ExportFile {
  app: 'onething'
  version: number
  exportedAt: number
  tasks: Task[]
}

export async function exportTasks(): Promise<ExportFile> {
  const tasks = await db.tasks.toArray()
  return { app: 'onething', version: EXPORT_VERSION, exportedAt: Date.now(), tasks }
}

const VALID_BUCKETS = new Set<Bucket>(['now', 'next', 'someday'])

/** Neteja una tasca del fitxer al nostre esquema; descarta la `id` (vegeu importTasks). */
function sanitizeTask(raw: unknown): Omit<Task, 'id'> | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  if (typeof t.title !== 'string' || !t.title.trim()) return null
  const clean: Omit<Task, 'id'> = {
    title: t.title.trim(),
    bucket: VALID_BUCKETS.has(t.bucket as Bucket) ? (t.bucket as Bucket) : 'now',
    done: t.done === 1 ? 1 : 0,
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
  }
  if (Array.isArray(t.steps)) clean.steps = t.steps.map(String)
  if (Array.isArray(t.doneSteps)) {
    clean.doneSteps = t.doneSteps.filter(
      (n): n is number => Number.isInteger(n) && (n as number) >= 0,
    )
  }
  if (clean.done === 1 && typeof t.completedAt === 'number') {
    clean.completedAt = t.completedAt
  }
  return clean
}

/**
 * Importa les tasques d'un fitxer exportat. Les afegeix com a entrades NOVES
 * (sense `id`) en comptes de sobreescriure: les `id` són autoincrementals per
 * navegador, així que coincidir-les entre navegadors no té sentit i sobreescriure
 * podria carregar-se tasques d'aquí. Mai destrueix res; com a molt, duplica.
 * Torna quantes n'ha importat.
 */
export async function importTasks(data: unknown): Promise<number> {
  const file = data as { app?: string; tasks?: unknown } | null
  // Acceptem 'una' (marca antiga) a més de 'onething' per no trencar fitxers ja exportats.
  if (!file || (file.app !== 'onething' && file.app !== 'una') || !Array.isArray(file.tasks)) {
    throw new Error('Això no sembla un fitxer d’Onething.')
  }
  const clean = file.tasks
    .map(sanitizeTask)
    .filter((t): t is Omit<Task, 'id'> => t !== null)
  if (clean.length === 0) return 0
  await db.tasks.bulkAdd(clean as Task[])
  return clean.length
}
