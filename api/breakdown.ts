/**
 * Funció serverless: /api/breakdown
 *
 * Aquí és on vive la killer feature de debò ("No sé per on començar").
 * El client (src/ai.ts) crida aquest endpoint amb { title, feeling, minutes, lang,
 * device }; demanem a Claude que parteixi la tasca en micro-passos i tornem
 * { steps: string[] }.
 *
 * La clau d'API NO surt mai d'aquí: viu a la variable d'entorn ANTHROPIC_API_KEY
 * del servidor (Vercel), no al bundle del navegador. Cap dada de l'usuari es desa;
 * només passa per Claude i torna.
 *
 * Cost i abús: limitem amb un magatzem compartit (Upstash Redis) — una ració diària
 * per dispositiu (el "pla gratuït") + tallaffocs per IP. Si Upstash no està
 * configurat (p. ex. en local), les limitacions es desactiven i el sostre de
 * despesa d'Anthropic segueix sent el límit dur. Si la funció falla o bloqueja,
 * src/ai.ts cau al fallback heurístic local, així que la UX no es trenca mai.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const client = new Anthropic() // llegeix ANTHROPIC_API_KEY de l'entorn

// Haiku 4.5: ~3-4× més econòmic que Sonnet i prou per a una tasca tan acotada
// (partir en 3-5 passos). NOTA: Haiku NO admet el paràmetre `effort` (donaria 400).
const MODEL = 'claude-haiku-4-5'

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
- DISTINGEIX tasca de projecte. Si el que et donen és un objectiu GRAN o vague que de
  debò són moltes tasques (p. ex. "planificar vacances", "reformar la cuina", "preparar
  oposicions"), NO saltis a un pas d'execució tardà (comprar bitllets, anar a l'aeroport,
  trucar al paleta...). Els passos han de ser les PRIMERES DECISIONS que acoten el
  projecte i el fan abordable: posar un sostre de temps/diners, decidir el marc bàsic,
  triar entre poques opcions concretes. El primer encara ha de ser un gest mínim de 2 min.
- To calmat i amable, mai imperatiu dur ni motivacional cridaner.
- Respon SEMPRE en l'idioma que se't demani al final (l'exemple de sota és només per
  il·lustrar el format i el nivell de concreció, no l'idioma).
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
- Confirma l'esborrany si tot encaixa, o demana cita prèvia si hi ha res estrany.

Exemple d'un objectiu GRAN (projecte), on els passos són decisions que l'acoten, no execució —
Tasca: "planificar les vacances"
Passos:
- Agafa el mòbil o un paper i escriu una sola línia: en quin mes vols anar-hi (només decidir-ho).
- Posa un sostre de pressupost aproximat per a tot el viatge (una xifra, encara que sigui a ull).
- Decideix amb qui hi vas i quants dies, perquè això mana tota la resta.
- Apunta 2-3 destins que t'abelleixin dins d'aquell pressupost, sense triar-ne cap encara.
- Mira per sobre vols o allotjament d'UN d'aquests destins, només per fer-te una idea de preus.`

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

// --- Límits de cost i abús ---

const DAILY_PER_DEVICE = 25 // ració gratuïta diària per dispositiu (el "pla gratuït")
const DAILY_PER_IP = 150 // tallaffoc anti-abús per IP (cobreix IPs compartides)
const BURST_PER_IP = 20 // ràfega per minut per IP (atura bots)
const DAY_TTL = 90_000 // ~25 h, perquè les claus diàries es netegin soles

// Magatzem compartit per comptar. La integració d'Upstash a Vercel injecta les
// credencials amb prefix KV_*; acceptem també els noms UPSTASH_* per compatibilitat.
// Si no n'hi ha cap → fail-open (no limitem).
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

/** Incrementa un comptador amb caducitat i torna el recompte (o null si no hi ha magatzem). */
async function bump(key: string, ttlSeconds: number): Promise<number | null> {
  if (!redis) return null // sense magatzem → no limitem (fail-open)
  try {
    const n = await redis.incr(key)
    if (n === 1) await redis.expire(key, ttlSeconds)
    return n
  } catch {
    return null // si Redis falla, no bloquegem (el spend cap protegeix el cost)
  }
}

/**
 * Mateix origen: només acceptem peticions del domini que serveix l'app. Atura
 * altres webs i `curl` sense capçalera (dissuasiu, no barrera: `Origin` es pot falsejar).
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

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    return res.status(400).json({ error: 'title_required' })
  }
  // Tallem entrades absurdament llargues: és un títol de tasca, no un assaig.
  const safeTitle = title.slice(0, 500)

  // Límits: ràfega per IP → sostre diari per IP → ració diària per dispositiu.
  const ip = clientIp(req)
  const device = typeof req.body?.device === 'string' ? req.body.device.slice(0, 64) : ''
  const today = new Date().toISOString().slice(0, 10)

  const burst = await bump(`rl:burst:${ip}`, 60)
  if (burst !== null && burst > BURST_PER_IP) {
    return res.status(429).json({ error: 'rate_limited' })
  }
  const ipDay = await bump(`rl:ip:${ip}:${today}`, DAY_TTL)
  if (ipDay !== null && ipDay > DAILY_PER_IP) {
    return res.status(429).json({ error: 'rate_limited' })
  }
  // Ració diària per dispositiu: capturem el recompte per informar-ne el client.
  let used = 0
  if (device) {
    const n = await bump(`q:dev:${device}:${today}`, DAY_TTL)
    if (n !== null) {
      used = n
      if (n > DAILY_PER_DEVICE) {
        return res
          .status(429)
          .json({ error: 'quota_exceeded', limit: DAILY_PER_DEVICE, used: n })
      }
    }
  }

  // Context opcional (com es sent + quant temps) per afinar el desglossament.
  const FEELINGS: Record<string, string> = {
    clar: 'Ho té clar i vol arrencar.',
    mandra: 'Li fa mandra, té poca energia.',
    bloquejat: 'Se sent bloquejat, no sap per on començar.',
    ansietat: 'La tasca li genera ansietat.',
  }
  const feeling = typeof req.body?.feeling === 'string' ? req.body.feeling : ''
  const minutes = Number(req.body?.minutes)
  const simpler = req.body?.simpler === true
  const LANG_NAME: Record<string, string> = { en: 'English', ca: 'Catalan', es: 'Spanish' }
  const lang = LANG_NAME[req.body?.lang as string] ?? 'English'
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
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      output_config: {
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `Parteix aquesta tasca en micro-passos: "${safeTitle}"${ctxLine}${
            simpler
              ? `\n\nIMPORTANT: l'usuari troba aquest pas massa gran. Fes passos encara MÉS petits i trivials del que faries normalment; el primer ha de poder-se fer en ~30 segons.`
              : ''
          }\n\nIdioma de la resposta: ${lang}. Escriu TOTS els passos en aquest idioma.`,
        },
      ],
    })

    // Registre del cost real (tokens) per poder ajustar quotes/model amb dades.
    console.log('breakdown', { model: MODEL, usage: message.usage })

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

    return res.status(200).json({ steps, used, limit: DAILY_PER_DEVICE })
  } catch (err) {
    console.error('breakdown error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
