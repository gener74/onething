<div align="center">

# OneThing — _una cosa a la vegada_

**A calm focus tool for ADHD brains: it gets you started.**
When a task paralyses you, it breaks it into one tiny step and stays with you until you’ve begun — not another to-do list. Local-first, no accounts.

[**Live demo →**](https://getonething.vercel.app) · _private preview, password: `onething`_

🇬🇧 English · [🌿 Català més avall](#-onething--una-cosa-a-la-vegada-1)

</div>

<!-- TODO (Ward): afegeix les imatges a docs/ abans d'ensenyar el portfoli:
     docs/onething-demo.gif  ·  docs/onething-focus.png  ·  docs/onething-empty.png -->

![OneThing demo](docs/onething-demo.gif)

---

## Why

Most to-do apps make ADHD worse: long lists, dates that expire and pile up guilt, and the silent question _“where do I even start?”_. **OneThing** does the opposite. You brain-dump without friction, sort into three soft drawers (not dates), and when a task paralyses you, it doesn’t hand you a plan — **it walks you to the first 2-minute step and stays with you until you’ve started.**

I built it because I live this: I’m my own target user. It’s also a deliberate exercise in calm, _spa-digital_ product design and in a genuinely **local-first** architecture.

> The difference from ChatGPT: ChatGPT gives you a plan. OneThing accompanies you until you begin.

## What it does

The heart of it — **“I don’t know where to start”:**

- **It gets you started.** Real Claude splits the paralysing task into tiny, concrete micro-steps, shown **one at a time** — never the whole list.
- **Context-aware.** First it asks _how you feel_ and _how much time_ you have, so the very first step fits your state right now.
- **Coach, not manager.** A gentle check-in when your time’s up — _“distracted? no problem, let’s go back: open the document.”_ No judgement, no guilt. A quiet “you’ve started” after the first step.

The calm scaffolding around it:

- **Focus Mode** — one task fills the screen, everything else is hidden. A breathing circle anchors you.
- **Frictionless capture** — brain-dump in one field; sort into three soft drawers `Ara` / `Després` / `Algun dia` (Now / Later / Someday). No dates, on purpose.
- **Calm reward** — a sage moment when you finish, plus a soft per-day count. No streaks, no pressure.
- **100% local & installable** — your data never leaves the device; works offline as an installable PWA.

## Interesting engineering decisions

These are the bits I’d talk through in an interview:

- **Local-first as a legal feature.** No backend for user data, no accounts → no GDPR surface. The browser’s IndexedDB is the only store; `requestPersistence()` upgrades it to durable. Portability is honest: user-controlled JSON export/import.
- **The AI key never reaches the browser.** Breakdown runs in a Vercel serverless function (`api/breakdown.ts`) that holds `ANTHROPIC_API_KEY` server-side and calls Claude (`claude-haiku-4-5`) with **structured outputs** (a JSON schema forcing `{ steps }`).
- **Cost & abuse control for a public AI endpoint.** A shared rate limiter (Upstash Redis) enforces a per-device daily quota (the free tier) plus per-IP daily and burst caps — anonymous counters only, no user data — behind a same-origin check, with a hard Anthropic spend cap as the ceiling. Over quota degrades gracefully to a local heuristic and a calm "back tomorrow" message.
- **Graceful degradation.** If the endpoint is down, blocked, or over quota, the client falls back to a local heuristic so the UX never breaks.
- **`done` is stored as `0 | 1`, not a boolean** — IndexedDB can’t index booleans, and the queries rely on `.where('done').equals(0|1)`.
- **Buckets over dates** — a product decision encoded in the data model to avoid the anxiety of expiring deadlines.
- **Accessibility & calm** — everything respects `prefers-reduced-motion` (the breathing circle and the falling-leaves empty state stop cleanly).

## Stack

**React 19** · **TypeScript** · **Vite** · **Tailwind v4** (design tokens in `@theme`) · **Dexie / IndexedDB** · **vite-plugin-pwa** · **Vercel** serverless functions + **Claude** API · **Upstash Redis** (rate limiting). Native iOS/Android packaging with **Capacitor** is planned, reusing the same codebase.

## Run it locally

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc -b && vite build (typecheck + build + PWA)
npm run lint     # eslint
```

The AI lives in the serverless function `api/breakdown.ts` and needs a Claude key in `ANTHROPIC_API_KEY` (see `.env.example`). With plain `npm run dev` there’s no endpoint, so you’ll get the **local heuristic fallback**; to exercise real Claude locally, run `vercel dev`. In production a push to `main` auto-deploys to Vercel.

## Scope (v1)

**In:** brain dump · triage into 3 drawers · focus mode · AI breakdown · calm reward.
**Deliberately out:** calendars, projects, tags, collaboration, cross-device sync, push notifications.

---
---

<div align="center">

# 🌿 OneThing — _una cosa a la vegada_

**Una eina de focus calmada per a cervells amb TDAH: t’ajuda a començar.**
Quan una tasca et paralitza, la parteix en un sol pas petit i es queda amb tu fins que has començat — no és una altra llista de tasques. Local-first, sense comptes.

[**Prova la demo →**](https://getonething.vercel.app) · _versió privada, contrasenya: `onething`_

</div>

## Per què

La majoria d’apps de tasques empitjoren el TDAH: llistes infinites, dates que caduquen i acumulen culpa, i la pregunta silenciosa _“per on començo?”_. **OneThing** fa el contrari. Buides el cap sense fricció, ho classifiques en tres calaixos suaus (no dates) i, quan una tasca et paralitza, no et dóna un pla — **t’acompanya fins al primer pas de 2 minuts i es queda amb tu fins que has començat.**

L’he fet perquè ho visc: sóc el meu propi usuari objectiu. És també un exercici conscient de disseny calmat (_“spa digital”_) i d’una arquitectura de debò **local-first**.

> La diferència amb ChatGPT: ChatGPT et dóna un pla. OneThing t’acompanya fins que comences.

## Què fa

El moll de l’os — **“No sé per on començar”:**

- **T’ajuda a començar.** Claude de debò parteix la tasca que et paralitza en micro-passos concrets, mostrats **un a un** — mai la llista sencera.
- **Amb context.** Primer et pregunta _com et sents_ i _quant temps_ tens, perquè el primer pas s’ajusti al teu estat d’ara mateix.
- **Coach, no gestor.** Un check-in suau en acabar el temps — _“t’has distret? cap problema, tornem-hi: obre el document.”_ Sense judici, sense culpa. I un discret “ja has començat” al primer pas.

L’escenari calmat al voltant:

- **Mode Focus** — una sola tasca omple la pantalla; la resta s’amaga. Un cercle que respira t’ancora.
- **Captura sense fricció** — brain dump en un sol camp; classifica en tres calaixos `Ara` / `Després` / `Algun dia`. Sense dates, a propòsit.
- **Recompensa calmada** — un instant sàlvia en acabar i un recompte del dia. Sense ratxes ni pressió.
- **100% local i instal·lable** — les dades no surten mai del dispositiu; funciona offline com a PWA.

## Decisions tècniques interessants

- **Local-first com a garantia legal.** Cap backend de dades, sense comptes → sense RGPD. IndexedDB és l’únic magatzem; `requestPersistence()` el fa durador. Portabilitat honesta: export/import en JSON que controles tu.
- **La clau d’IA no arriba mai al navegador.** El desglossament corre en una funció serverless (`api/breakdown.ts`) que guarda `ANTHROPIC_API_KEY` al servidor i crida Claude (`claude-haiku-4-5`) amb **structured outputs** (un esquema JSON que força `{ steps }`).
- **Control de cost i abús d’un endpoint d’IA públic.** Un rate limiter compartit (Upstash Redis) aplica una quota diària per dispositiu (el pla gratuït) més sostres diari i de ràfega per IP — només comptadors anònims, cap dada d’usuari — darrere d’una comprovació de mateix origen, amb un sostre de despesa d’Anthropic com a límit dur. En superar la quota, degrada amablement a un heurístic local i un missatge “demà torna”.
- **Degradació elegant.** Si l’endpoint falla, es bloqueja o se supera la quota, el client cau a un heurístic local i la UX no es trenca mai.
- **`done` es desa com a `0 | 1`, no booleà** — IndexedDB no pot indexar booleans; les consultes fan `.where('done').equals(0|1)`.
- **Calaixos en lloc de dates** — una decisió de producte codificada al model de dades per evitar l’angoixa dels terminis.
- **Accessibilitat i calma** — tot respecta `prefers-reduced-motion`.

## Stack

**React 19** · **TypeScript** · **Vite** · **Tailwind v4** · **Dexie / IndexedDB** · **vite-plugin-pwa** · **Vercel** + **Claude** · **Upstash Redis** (rate limiting). Empaquetatge natiu a iOS/Android amb **Capacitor** previst, reaprofitant el mateix codi.

## Executar-ho en local

```bash
npm install
npm run dev      # servidor de desenvolupament (http://localhost:5173)
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

La IA viu a `api/breakdown.ts` i necessita una clau de Claude a `ANTHROPIC_API_KEY` (vegeu `.env.example`). Amb `npm run dev` no hi ha endpoint → **fallback heurístic**; per provar Claude de debò en local, fes `vercel dev`. En producció, un `push` a `main` desplega sol.

## Abast (v1)

**Dins:** brain dump · triatge en 3 calaixos · mode focus · desglossament amb IA · recompensa.
**Fora a propòsit:** calendaris, projectes, etiquetes, col·laboració, sync entre dispositius, notificacions push.

---

<div align="center">

Fet amb cura per **Ward Technologies Inc.** · _spa digital_ 🌿

</div>
