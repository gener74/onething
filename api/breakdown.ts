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
L'usuari et dóna una tasca que el paralitza. Parteix-la en passos petits i CONCRETS
que treguin la paràlisi i que de debò facin avançar AQUESTA tasca en particular.

Regles:
- Entre 3 i 5 passos.
- El PRIMER pas ha de ser ridículament petit: una sola acció de ~2 minuts que es pugui
  fer ara mateix sense pensar (obrir, treure, escriure una línia...).
- La RESTA de passos han de ser ESPECÍFICS d'aquesta tasca, no plantilles genèriques.
  PROHIBIT el farciment buit tipus "prepara el que necessites", "fes-ne una part" o
  "decideix si continues": digues SEMPRE què exactament (quin document, quina web, a qui
  escriure, quina secció...).
- Cada pas és UNA sola acció observable, en imperatiu, breu i clara.
- Si la tasca és ambigua, fes una suposició raonable i sigues concret igualment.
- To calmat i amable, mai imperatiu dur ni motivacional cridaner.
- Sempre en català.
- No afegeixis introduccions, números ni explicacions: només els passos.

Opcionalment rebràs context sobre com es sent l'usuari i quant temps té ara. Si hi és, fes-lo servir:
- Adapta el TO a l'emoció. Bloquejat o amb ansietat → fes el primer pas encara més petit, concret
  i tranquil·litzador (treure por d'equivocar-se). Mandra / poca energia → fes-lo trivial i sense
  compromís ("només obrir", "només mirar"). Ho té clar → ves al gra, sense embuts.
- Ajusta la mida del PRIMER pas al temps disponible: amb pocs minuts (2-5), un sol gest mínim
  que càpiga de sobres en aquell temps; amb més temps (15-30), el primer pas pot ser una mica
  més substancial, però sempre arrencable de seguida i sense pensar.

Exemple del nivell de concreció esperat —
Tasca: "fer la declaració de la renda"
Passos:
- Obre el calaix o la carpeta on guardes els papers d'Hisenda (només obrir-lo).
- Aplega tres documents: el certificat de retencions de la feina, els rebuts deduïbles i el DNI.
- Entra a la seu de l'Agència Tributària i identifica't amb Cl@ve o certificat.
- Obre l'esborrany i comprova que les dades personals i els ingressos quadren.
- Confirma l'esborrany si tot encaixa, o demana cita prèvia si hi ha res estrany.`

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

  // Context opcional (com es sent + quant temps) per afinar el desglossament.
  const FEELINGS: Record<string, string> = {
    clar: 'Ho té clar i vol arrencar.',
    mandra: 'Li fa mandra, té poca energia.',
    bloquejat: 'Se sent bloquejat, no sap per on començar.',
    ansietat: 'La tasca li genera ansietat.',
  }
  const feeling = typeof req.body?.feeling === 'string' ? req.body.feeling : ''
  const minutes = Number(req.body?.minutes)
  const ctxParts: string[] = []
  if (FEELINGS[feeling]) ctxParts.push(`Com es sent ara: ${FEELINGS[feeling]}`)
  if (Number.isFinite(minutes) && minutes > 0) {
    ctxParts.push(`Temps disponible ara mateix: ${minutes} minuts.`)
  }
  const ctxLine = ctxParts.length
    ? `\n\nContext de l'usuari:\n- ${ctxParts.join('\n- ')}`
    : ''

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM,
      // effort mitjà: partir bé una tasca real demana pensar una mica; 'low' donava
      // passos massa plans. Sonnet a 'medium' segueix sent ràpid i econòmic.
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `Parteix aquesta tasca en micro-passos: "${safeTitle}"${ctxLine}`,
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
