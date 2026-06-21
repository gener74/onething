# onething — una cosa a la vegada

Eina de focus **calmada, minimalista i local-first** per a cervells amb TDAH.
Projecte d'un sol desenvolupador (nivell avançat), objectiu portfoli + aprendre.
Idioma de la interfície i del codi-comentaris: **català**.

## Filosofia (no la traïm)

- **Una cosa a la vegada.** El mode focus mostra NOMÉS una tasca; la resta desapareix.
- **Fricció zero** en capturar (l'enemic nº1 del TDAH).
- **Calma, no soroll.** To "spa digital": sàlvia, paper càlid, moviment suau. Respecta `prefers-reduced-motion`.
- **Local-first sagrat.** Cap dada surt del dispositiu → sense backend de dades, sense comptes, sense RGPD. Aquesta és la garantia legal del projecte; no la trenquis sense avisar.

## Comandes

```bash
npm run dev      # servidor de desenvolupament (http://localhost:5173)
npm run build    # tsc -b && vite build (typecheck + build + PWA)
npm run lint     # eslint
```

## Stack

- **React 19 + TypeScript + Vite 8**
- **Tailwind v4** — tokens de disseny a `src/index.css` dins de `@theme` (colors `paper`, `ink`, `muted`, `line`, `sage`, `sage-soft`, `sage-deep`)
- **Dexie / IndexedDB** — dades locals (`src/db.ts`)
- **vite-plugin-pwa** — instal·lable + offline
- **Capacitor** — previst MÉS ENDAVANT per empaquetar a iOS/Android amb el mateix codi

## Mapa de fitxers

```
src/
  db.ts              # Dexie: esquema Task + operacions (add/move/complete/delete)
  ai.ts              # killer feature: breakdownTask() → crida /api/breakdown + fallback local
  App.tsx            # pantalla principal: brain dump + calaixos + recompensa
  components/
    FocusMode.tsx    # mode focus: una tasca, cercle que respira, micro-passos, "Fet"
  index.css          # sistema de disseny (@theme) + animacions
vite.config.ts       # plugins: react, tailwind, PWA
```

📖 Documentació tècnica detallada (model de dades, IA, PWA, guia de "vull fer X"):
`ARQUITECTURA.md`.

## Convencions importants

- **`Task.done` es guarda com a `0 | 1`, NO booleà** — IndexedDB no pot indexar booleans. Les consultes fan servir `.where('done').equals(0|1)`.
- **Calaixos, no dates:** les tasques es classifiquen en `now` / `next` / `someday` (Ara / Després / Algun dia). Evitem dates a propòsit (angoixen i caduquen).
- Còpia de la UI sempre en **català** i en to calmat.

## Abast de la v1

**Dins:** brain dump, triatge en 3 calaixos, mode focus, IA que parteix tasques, recompensa.
**Fora (a propòsit):** calendaris, projectes, etiquetes, col·laboració, sync entre dispositius, notificacions push.

## Estat actual i SEGÜENT PAS

La killer feature ("No sé per on començar") crida **Claude de debò** via la funció
serverless `api/breakdown.ts` (model `claude-sonnet-4-6`, structured outputs → `{ steps }`)
i ja està **desplegada en producció**: https://getonething.vercel.app (domini net;
l'autogenerat https://una-steel.vercel.app segueix actiu en paral·lel). La clau viu a
`ANTHROPIC_API_KEY` (variables de Vercel); `src/ai.ts` manté el fallback heurístic si
l'endpoint no respon. En local, `npm run dev` (Vite sol) no té endpoint → fallback; cal
`vercel dev` per provar la IA real.

Repo: https://github.com/gener74/onething, connectat a Vercel → `push` a `main`
desplega sol a producció.

➡️ **Següent pas: polir cap a una v1 presentable.**
- Icones PWA de marca + manifest: **FET** (icona "cercle que respira",
  generades amb `@vite-pwa/assets-generator` des de `public/logo.svg`;
  `npm run generate-pwa-assets` per regenerar).
- `prefers-reduced-motion`: FET.
- Click-through final de l'app live al navegador.
- ⚠️ Model: `claude-sonnet-4-6`. **NO baixis a `claude-haiku-4-5` per estalviar** — es va
  provar (2026-06-21) i trencava el català (inventava paraules, barrejava tu/vós). L'app és
  català-first → Sonnet és el mínim; el sobrecost és menyspreable a aquesta escala.

## Idea aparcada (per a després d'`onething`)

"Explica-m'ho fàcil": foto d'un document administratiu → Claude l'explica en llenguatge senzill. Aparcada conscientment fins acabar `onething`.
