/**
 * Funció serverless: /api/event
 *
 * Mètrica mínima i ANÒNIMA per saber l'única cosa que de debò importa: de tots
 * els desglossaments que mostrem, quants porten la persona a fer el PRIMER pas
 * (el "started-rate", la north-star de l'app). No rep ni desa cap contingut ni
 * cap identificador: només incrementa un comptador global. Quatre esdeveniments
 * marquen l'embut (cadascun UN COP per sessió):
 *   - entered:  s'ha entrat a l'app des de la landing     → m:entered:total
 *   - captured: s'ha capturat la primera tasca            → m:captured:total
 *   - shown:    s'ha generat i mostrat un desglossament   → m:shown:total
 *   - started:  s'ha completat el primer pas d'una sessió → m:started:total
 *   - returned: un usuari que JA tenia tasques ha tornat  → m:returned:total
 * started-rate = m:started:total / m:shown:total. La resta situa ON es perd la
 * gent abans d'arribar-hi: visites (Vercel) → entered → captured → shown. Sense
 * `entered` no es pot distingir "se n'han anat de la landing" de "han entrat i
 * no han escrit res" —dos problemes oposats amb solucions oposades.
 *
 * Local-first intacte: res del que escrius surt d'aquí; només un "+1" sense
 * etiqueta. A diferència de la quota (`q:dev:*`, que caduca a ~25 h), aquests
 * comptadors NO caduquen → són l'històric que el dashboard efímer no et dóna.
 * Si Upstash no està configurat, no fa res (fail-open silenciós).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

// Esdeveniments acceptats → clau del comptador (llista blanca: res més s'admet).
const COUNTERS: Record<string, string> = {
  entered: 'm:entered:total',
  captured: 'm:captured:total',
  shown: 'm:shown:total',
  started: 'm:started:total',
  returned: 'm:returned:total',
}

const BURST_PER_IP = 60 // ~1/segon per IP: atura scripts que vulguin inflar la xifra

// Mateix magatzem compartit que la quota; mateixos noms d'env (KV_* o UPSTASH_*).
const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
let redis: Redis | null = null
if (redisUrl && redisToken) {
  try {
    redis = new Redis({ url: redisUrl, token: redisToken })
  } catch {
    redis = null
  }
}

/** Mateix origen: dissuadeix que altres webs o scripts inflin el comptador. */
function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return false
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for']
  const raw = Array.isArray(xff) ? xff[0] : xff
  return raw?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!sameOrigin(req)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  const key = COUNTERS[req.body?.name as string]
  if (!key) {
    return res.status(400).json({ error: 'unknown_event' })
  }

  // Sense magatzem → no mesurem, però no és cap error per al client.
  if (!redis) return res.status(204).end()

  try {
    // Tallaffoc anti-inflació: massa esdeveniments d'una IP en un minut → ignora.
    const ipKey = `rl:evt:${clientIp(req)}`
    const burst = await redis.incr(ipKey)
    if (burst === 1) await redis.expire(ipKey, 60)
    if (burst > BURST_PER_IP) return res.status(204).end()

    await redis.incr(key) // comptador global persistent (sense caducitat)
  } catch {
    // Mai bloquegem la UX per una mètrica.
  }
  return res.status(204).end()
}
