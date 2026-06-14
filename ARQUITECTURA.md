# Arquitectura tècnica — onething

Documentació pensada per **fer canvis manuals amb confiança**. Explica com encaixa tot
i, al final, una guia pràctica de "vull fer X → toca aquest fitxer".

> Per a la filosofia del producte i l'abast, mira `CLAUDE.md`. Aquí parlem de codi.

---

## 1. Stack i com executar

| Peça | Què fa |
|---|---|
| **React 19 + TypeScript** | UI i lògica de client |
| **Vite 8** | servidor de dev, build i bundler |
| **Tailwind v4** | estils via classes; tokens a `src/index.css` dins de `@theme` |
| **Dexie / IndexedDB** | base de dades **local** (cap dada surt del dispositiu) |
| **vite-plugin-pwa** | instal·lable + offline (service worker, manifest) |
| **@vite-pwa/assets-generator** | genera el joc d'icones des d'un sol SVG |
| **Vercel serverless** (`api/`) | amaga la clau de Claude per a la feature d'IA |

```bash
npm run dev                # http://localhost:5173 — RÀPID, però SENSE IA real (cau al fallback)
vercel dev                 # com dev però amb les funcions de api/ → IA real en local
npm run build              # tsc -b + vite build + genera PWA → dist/
npm run preview            # serveix dist/ ja construït (http://localhost:4173)
npm run lint               # eslint
npm run generate-pwa-assets# regenera les icones des de public/logo.svg
```

⚠️ **Gotcha important:** amb `npm run dev` (Vite sol) **no existeix** `/api/breakdown`, així que
la IA cau sempre al **fallback heurístic** (3 passos genèrics fixos). Per provar Claude de
debò: `vercel dev` o l'app en producció.

---

## 2. Mapa de fitxers

```
index.html              # punt d'entrada HTML; els <link> d'icones els injecta el plugin PWA
vite.config.ts          # plugins: react, tailwind, PWA (+ pwaAssets)
pwa-assets.config.ts    # config del generador d'icones (presets, fons paper)
public/
  logo.svg              # FONT de la icona de marca (el cercle); editar aquí i regenerar
  pwa-*.png, *.ico      # icones GENERADES (no editar a mà; surten de logo.svg)
api/
  breakdown.ts          # funció serverless: rep {title}, crida Claude, torna {steps}
src/
  main.tsx              # arrenca React; crida requestPersistence()
  index.css             # sistema de disseny (@theme) + animacions + reduced-motion
  db.ts                 # Dexie: model Task + totes les operacions de dades
  ai.ts                 # client de la feature d'IA: fetch a /api/breakdown + fallback
  App.tsx               # pantalla principal: capçalera, brain dump, calaixos, recompensa
  components/
    Gate.tsx            # portada privada amb contrasenya (VITE_GATE_CODE)
    Mark.tsx            # la icona del cercle que respira (reutilitzable)
    FocusMode.tsx       # mode focus a pantalla completa: una tasca, passos, "Fet"
```

`src/assets/` (hero.png, react.svg, vite.svg) són restes de la plantilla de Vite; ara
mateix no es fan servir a la UI.

---

## 3. Model de dades (`src/db.ts`)

Tota la persistència és local via Dexie (IndexedDB). **No hi ha backend de dades.**

```ts
interface Task {
  id: number
  title: string
  bucket: 'now' | 'next' | 'someday'  // calaix; deliberadament NO fem servir dates
  steps?: string[]        // micro-passos generats per la IA
  doneSteps?: number[]    // índexs dels passos ja marcats (recompensa pas a pas)
  done: 0 | 1             // 0/1, NO booleà: IndexedDB no pot indexar booleans
  createdAt: number
  completedAt?: number
}
```

Convencions que **no s'han de trencar**:
- **`done` és `0 | 1`**, mai `true/false`. Les consultes fan `.where('done').equals(0)`.
- **Calaixos, no dates.** `bucket` classifica en Ara/Després/Algun dia.
- El nom de la BD és `'una'` (marca original) a propòsit: canviar-lo orfenaria les dades
  locals ja existents. És un identificador intern invisible.

Índexs definits (`db.version(1).stores`): `++id, bucket, done, createdAt, completedAt`.
Si afegeixes un camp i el vols **consultar per índex**, cal pujar la versió de l'esquema
(vegeu §9, "Afegir un camp a Task").

Operacions exportades: `addTask`, `moveTask`, `setSteps`, `toggleStep`, `completeTask`,
`deleteTask`, `exportTasks`, `importTasks`, `requestPersistence`, `isToday`.

---

## 4. Pantalla principal (`src/App.tsx`)

És un sol component amb estat local mínim:

- `tasks` — `useLiveQuery` de Dexie: **reactiu**. Quan canvia la BD, la UI es redibuixa
  sola. (Per això marcar un pas o completar una tasca s'actualitza a l'instant.)
- `byBucket` — `useMemo` que reparteix `tasks` en els tres calaixos.
- `draft` — text de l'input de brain dump.
- `focusId` — id de la tasca oberta en Mode Focus (`null` = tancat).
- `celebrate` — mostra la recompensa 1,6 s després de completar.
- `loaded` / `isEmpty` — controlen l'estat buit (benvinguda) sense parpelleig.

Render, de dalt a baix: capçalera (marca + "fetes avui") → input → **o** benvinguda buida
**o** els tres calaixos → footer (export/import) → `<FocusMode>` (si n'hi ha) → recompensa.

Components auxiliars al mateix fitxer: `Mark` (la icona del cercle que respira) i
`BucketMenu` (botons per moure una tasca de calaix).

---

## 5. Mode Focus (`src/components/FocusMode.tsx`)

Overlay a pantalla completa (`fixed inset-0 z-50`) que tapa la resta — el "una cosa a la
vegada". Rep la tasca i quatre callbacks: `onComplete`, `onClose`, `onSteps`,
`onToggleStep`.

- **Cercle que respira** amb un cronòmetre suau (no és un temporitzador amb pressió, és
  una àncora visual de calma).
- **Micro-passos:** si la tasca encara no en té, mostra el botó "No sé per on començar"
  que crida `breakdownTask()`. Si ja en té, els pinta com a **caselles clicables**
  (`onToggleStep`). Quan tots estan marcats, convida a tancar amb el botó "Fet".
- Escape tanca el mode.

---

## 6. La killer feature: IA que parteix tasques

Dues meitats:

**Client — `src/ai.ts`**
`breakdownTask(title)` fa `fetch('/api/breakdown')`. Si respon bé → `{ steps, fromAI: true }`.
Si falla (sense xarxa, endpoint no desplegat, error) → `heuristicBreakdown()` local
(`fromAI: false`). Així la UX **mai es trenca**.

**Servidor — `api/breakdown.ts`** (funció serverless de Vercel)
1. Comprova mètode POST, mateix origen i rate limit (vegeu sota).
2. Crida Claude (`client.messages.create`) amb:
   - `model: 'claude-sonnet-4-6'`
   - `output_config.effort: 'medium'` — com de profund pensa (low/medium/high).
   - `output_config.format` amb **structured outputs** (`json_schema`) → força exactament
     `{ steps: string[] }`, sense parsing fràgil.
   - `SYSTEM` — les instruccions de com partir la tasca (to, nombre de passos, prohibir
     passos genèrics, exemple).
3. Torna `{ steps }`. La **clau d'API viu només al servidor** (`ANTHROPIC_API_KEY` a les
   variables de Vercel); mai arriba al navegador.

**Protecció de l'endpoint** (dissuasius, no barreres dures):
- `sameOrigin()` — bloqueja altres webs i `curl` sense capçalera `Origin`.
- Rate limit en memòria (20/min per IP) — best-effort; en serverless cada instància té la
  seva memòria. La barrera dura real és el límit de despesa d'Anthropic a la consola.

---

## 7. Sistema de disseny (`src/index.css`)

Els colors i el radi viuen com a **tokens** dins de `@theme` → es fan servir com a classes
Tailwind (`bg-sage`, `text-ink`, `rounded-[var(--radius-soft)]`...).

| Token | Valor | Ús |
|---|---|---|
| `--color-paper` | `#fbfaf7` | fons |
| `--color-surface` | `#ffffff` | targetes/inputs |
| `--color-ink` | `#2a2a2e` | text principal |
| `--color-muted` | `#8a8a93` | text secundari |
| `--color-line` | `#ecebe5` | vores |
| `--color-sage` / `-soft` / `-deep` | verds | accent calmat |

- El **caliu de fons** és el `background` del `body` (dos `radial-gradient` sàlvia molt
  subtils). Pujar/baixar l'`alpha` (ara `0.13` i `0.06`) en regula la intensitat.
- **Animacions:** `animate-rise` (aparició suau) i `animate-breathe` (el cercle).
- **`prefers-reduced-motion`:** el bloc `@media` global atura TOTES les animacions
  (incloent les infinites). Qualsevol animació nova queda coberta automàticament.

---

## 8. PWA i icones

- `vite.config.ts` → `VitePWA({ ..., pwaAssets: { config: true } })`. El manifest (nom,
  colors, display) es defineix allà; **les icones les injecta el generador**, no es
  posen a mà.
- `pwa-assets.config.ts` → quines mides es generen i el fons de farciment (paper).
- Per **canviar la icona**: edita `public/logo.svg` i executa `npm run generate-pwa-assets`
  (o `npm run build`, que també les regenera). No toquis els PNG: són generats.

---

## 9. Guia pràctica — "vull fer X"

**Canviar un color de marca** → `src/index.css`, el token dins de `@theme`. Es propaga a
tota la UI.

**Canviar la intensitat del caliu de fons** → `src/index.css`, els `alpha` dels
`radial-gradient` al `body` (`0.13`/`0.06`).

**Editar com parteix les tasques la IA** → `api/breakdown.ts`, constant `SYSTEM` (to,
nombre de passos, exemples). Per a respostes més/menys profundes: `effort` (`low`/`medium`/
`high`). Per canviar de model o abaratir: el camp `model` (p. ex. `claude-haiku-4-5`).
⚠️ Els canvis a `api/` només s'apliquen en producció o amb `vercel dev`.

**Millorar el fallback local** → `src/ai.ts`, funció `heuristicBreakdown()`.

**Canviar textos de la UI** → `src/App.tsx` i `src/components/FocusMode.tsx` (literals en
català directament al JSX).

**Afegir/reanomenar un calaix** → `src/db.ts` (tipus `Bucket` + `VALID_BUCKETS`) i
`src/App.tsx` (array `BUCKETS`). Si en treus un, pensa què passa amb tasques que ja
l'usaven.

**Canviar la icona** → edita `public/logo.svg`, després `npm run generate-pwa-assets`.

**Afegir un camp a `Task`** →
1. `src/db.ts`: afegeix-lo a la interfície `Task`.
2. Si vols **consultar-lo per índex**: puja la versió de l'esquema
   (`db.version(2).stores({ tasks: '++id, bucket, done, ...elNou' })`). Si només el
   llegeixes/escrius, no cal índex ni nova versió.
3. Afegeix-lo a `sanitizeTask()` perquè sobrevisqui a export/import.
4. Camps opcionals (`?`) són retrocompatibles amb dades ja existents; els obligatoris no.

**Tocar la recompensa** → `src/App.tsx`, estat `celebrate` + el bloc de baix de tot del
render (el `🌿` i el text).

**Canviar/treure la contrasenya de la portada** → la lògica és a `src/components/Gate.tsx`,
però la contrasenya **no és al codi**: és la variable `VITE_GATE_CODE`. Per canviar-la en
local, edita `.env.local`; a producció, Vercel → Settings → Environment Variables →
`VITE_GATE_CODE` (entorn Production) + redeploy. Per **desactivar la porta** (fer-ho públic),
deixa la variable buida o esborra-la i redeploya. Nota: el valor s'insereix al bundle en
temps de build → és una tanca per a curiosos, no una barrera robusta.

**Ajustar animacions** → `src/index.css` (`@keyframes` + classes `.animate-*`).

---

## 10. Desplegament

GitHub `gener74/onething` està connectat a Vercel: **`push` a `main` → desplega sol a
producció** (`getonething.vercel.app`). No hi ha pas manual. `ANTHROPIC_API_KEY` està
configurada a les variables de Vercel (Production/Preview/Development).
