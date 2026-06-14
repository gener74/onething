/**
 * Funció serverless: /api/breakdown
 *
 * Aquí és on vive la killer feature de debò ("No sé per on començar").
 * El client (src/ai.ts) crida aquest endpoint amb { title }; nosaltres demanem
 * a Claude que parteixi la tasca en micro-passos i tornem { steps: string[] }.
 *
 * La clau d'API NO surt mai d'aquí: viu a la variable d'entorn ANTHROPIC_API_KEY
 * del servidor (Vercel), no al bundle del navegador. Això manté la promesa
 * local-first: cap dada de l'usuari es desa enlloc; només passa per Claude i torna.
 *
 * Si aquesta funció falla o no està desplegada, src/ai.ts cau al fallback
 * heurístic local, així que la UX no es trenca mai.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const client = new Anthropic() // llegeix ANTHROPIC_API_KEY de l'entorn

const SYSTEM = `Ets un ajudant per a cervells amb TDAH dins d'una eina de focus calmada.
L'usuari et dóna una tasca que el paralitza. La teva feina és partir-la en una llista
curta de passos petits i concrets que treguin la paràlisi.

Regles:
- Entre 3 i 5 passos.
- El PRIMER pas ha de ser ridículament petit: una sola acció de ~2 minuts que es pugui
  fer ara mateix sense pensar (obrir, treure, escriure una línia...).
- Cada pas és UNA sola acció observable, en imperatiu, breu.
- To calmat i amable, mai imperatiu dur ni motivacional cridaner.
- Sempre en català.
- No afegeixis introduccions, números ni explicacions: només els passos.`

/** Esquema d'eixida: forcem exactament { steps: string[] } amb structured outputs. */
const SCHEMA = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['steps'],
  additionalProperties: false,
} as const

// --- Protecció bàsica de l'endpoint ---

/**
 * Mateix origen: només acceptem peticions del domini que serveix l'app (mateix
 * host). Atura altres webs i `curl` sense capçalera. NOTA: la capçalera `Origin`
 * es pot falsejar des d'un client no-navegador → és un dissuasiu, no una barrera.
 */
function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return false
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

/**
 * Rate limit per IP en memòria: best-effort. En serverless cada instància té la
 * seva pròpia memòria i es reinicia en arrencades fredes, així que atura ràfegues
 * contra una mateixa instància, NO un atac distribuït. Per a protecció robusta
 * caldria un magatzem compartit (Vercel KV / Upstash Redis).
 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map<string, number[]>()

function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for']
  const raw = Array.isArray(xff) ? xff[0] : xff
  return raw?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (!sameOrigin(req)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'rate_limited' })
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    return res.status(400).json({ error: 'title_required' })
  }
  // Tallem entrades absurdament llargues: és un títol de tasca, no un assaig.
  const safeTitle = title.slice(0, 500)

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM,
      // effort baix: la tasca és senzilla i volem una resposta àgil i econòmica.
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `Parteix aquesta tasca en micro-passos: "${safeTitle}"`,
        },
      ],
    })

    if (message.stop_reason === 'refusal') {
      // Cas rar: classificadors de seguretat. Deixem que el client caigui al fallback.
      return res.status(502).json({ error: 'refused' })
    }

    const text = message.content.find((b) => b.type === 'text')?.text ?? ''
    const parsed = JSON.parse(text) as { steps?: unknown }
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.map(String).filter((s) => s.trim().length > 0)
      : []

    if (steps.length === 0) {
      return res.status(502).json({ error: 'empty' })
    }

    return res.status(200).json({ steps })
  } catch (err) {
    console.error('breakdown error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
