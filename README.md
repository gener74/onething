<div align="center">

# OneThing — _una cosa a la vegada_

**A calm tool for people who get stuck before starting.**
Not another to-do list — a coach that helps you begin.

[**Live demo →**](https://getonething.vercel.app) · _free · no sign-up · your data stays on your device_

🇬🇧 English · [🌿 Català més avall](#-onething--una-cosa-a-la-vegada-1)

</div>

<!-- TODO (Ward): afegeix les imatges a docs/ abans d'ensenyar el portfoli:
     docs/onething-demo.gif  ·  docs/onething-focus.png  ·  docs/onething-empty.png -->

![OneThing demo](docs/onething-demo.gif)

---

## Why

> You know what you need to do.
> You’ve known it for days.
> You still haven’t started.

**OneThing gets you started.** When a task paralyses you, it doesn’t hand you a plan — it breaks it into one tiny step and stays with you, one step at a time. **Open it when you’re stuck; stay as long as it helps.**

Built for ADHD brains — and anyone who freezes in front of a big task. Most to-do apps make that worse: long lists, dates that expire into guilt, and the silent _“where do I even start?”_. I built it because I live this — I’m my own target user. It’s also a deliberate exercise in calm, _spa-digital_ design and a genuinely **local-first** architecture.

> The difference from ChatGPT: ChatGPT gives you a plan. OneThing walks it with you, one step at a time.

## What it does

The heart of it — **“I don’t know where to start”:**

- **It gets you started.** It breaks the paralysing task into tiny, concrete actions, shown **one at a time** — never the whole list.
- **Context-aware.** First it asks _how you feel_ and _how much time_ you have, so the very first step fits your state right now.
- **Coach, not manager.** A gentle check-in when your time’s up — _“distracted? no problem, let’s go back: open the document.”_ No judgement, no guilt. A quiet “you’ve started” after the first step. Still stuck? Ask for an even smaller step. Come back later and it picks up where you left off.

The calm scaffolding around it:

- **Focus Mode** — one task fills the screen, everything else is hidden. A breathing circle anchors you.
- **Frictionless capture** — brain-dump in one field; sort into three soft drawers `Ara` / `Després` / `Algun dia` (Now / Later / Someday). No dates, on purpose.
- **Calm reward** — a sage moment when you finish, plus a soft per-day count. No streaks, no pressure.
- **100% local & installable** — your data never leaves the device; works offline as an installable PWA.

## A real session

**Task:** _Prepare the monthly service review_

> → Open last month’s presentation — _done_
> → Read the conclusions slide — _done_
> → Write one improvement point

You didn’t plan the whole review. You just started it.

## Who it’s for

People with **ADHD** · students · knowledge workers · anyone overwhelmed by a large task.

## Interesting engineering decisions

These are the bits I’d talk through in an interview:

- **Local-first as a legal feature.** No backend for user data, no accounts → no GDPR surface. The browser’s IndexedDB is the only store; `requestPersistence()` upgrades it to durable. Portability is honest: user-controlled JSON export/import.
- **The AI key never reaches the browser.** Breakdown runs in a Vercel serverless function (`api/breakdown.ts`) that holds `ANTHROPIC_API_KEY` server-side and calls Claude (`claude-sonnet-4-6`) with **structured outputs** (a JSON schema forcing `{ steps }`). Sonnet over cheaper Haiku on purpose: the product is Catalan-first and the smaller model fabricated words — at this scale the cost delta is negligible.
- **Cost & abuse control for a public AI endpoint.** A shared rate limiter (Upstash Redis) enforces a per-device daily quota (the free tier) plus per-IP daily and burst caps — anonymous counters only, no user data — behind a same-origin check, with a hard Anthropic spend cap as the ceiling. Over quota degrades gracefully to a local heuristic and a calm "back tomorrow" message.
- **Graceful degradation.** If the endpoint is down, blocked, or over quota, the client falls back to a local heuristic so the UX never breaks.
- **`done` is stored as `0 | 1`, not a boolean** — IndexedDB can’t index booleans, and the queries rely on `.where('done').equals(0|1)`.
- **Buckets over dates** — a product decision encoded in the data model to avoid the anxiety of expiring deadlines.
- **Accessibility & calm** — everything respects `prefers-reduced-motion` (the breathing circle and the falling-leaves empty state stop cleanly).
- **Measuring success without betraying local-first.** The north-star is the **started-rate**: of all first steps shown, how many actually get done. It’s measured with two anonymous global counters in Upstash (`api/event.ts`) — **no content, no identifier, just a `+1`** — so the privacy promise holds.

## Measuring whether it works

**started-rate = `m:started:total` / `m:shown:total`** — of all the first steps shown, how many get done.

Read it in the Upstash console → `onething-redis` → **Data Browser** → filter `m:*`:

- `m:shown:total` — first steps shown _(denominator)_
- `m:started:total` — sessions where the first step was completed _(numerator)_

These counters **don’t expire**, so they’re the real history — unlike the `q:dev:*` daily-quota keys (~25 h TTL) or Vercel’s free log retention (~30 min). The pings are best-effort, so the number is approximate (a validation signal, not accounting), and it says nothing about _who_ or _what_ — anonymous on purpose.

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

**Una eina calmada per a qui s’encalla abans de començar.**
No és una altra llista de tasques — un coach que t’ajuda a arrencar.

[**Prova-la →**](https://getonething.vercel.app) · _gratis · sense compte · les teves dades es queden al dispositiu_

</div>

## Per què

> Saps què has de fer.
> Fa dies que ho saps.
> Encara no has començat.

**OneThing t’ajuda a començar.** Quan una tasca et paralitza, no et dóna un pla — la parteix en un sol pas petit i es queda amb tu, pas a pas. **Obre-la quan estiguis encallat; queda-t’hi mentre t’ajudi.**

Pensada per a cervells amb TDAH — i per a qualsevol que es bloqueja davant d’una tasca gran. La majoria d’apps ho empitjoren: llistes infinites, dates que caduquen en culpa i el silenciós _“per on començo?”_. L’he feta perquè ho visc — sóc el meu propi usuari objectiu. És també un exercici conscient de disseny calmat (_“spa digital”_) i d’una arquitectura de debò **local-first**.

> La diferència amb ChatGPT: ChatGPT et dóna un pla. OneThing el camina amb tu, pas a pas.

## Què fa

El moll de l’os — **“No sé per on començar”:**

- **T’ajuda a començar.** Parteix la tasca que et paralitza en accions concretes i petites, mostrades **una a una** — mai la llista sencera.
- **Amb context.** Primer et pregunta _com et sents_ i _quant temps_ tens, perquè el primer pas s’ajusti al teu estat d’ara mateix.
- **Coach, no gestor.** Un check-in suau en acabar el temps — _“t’has distret? cap problema, tornem-hi: obre el document.”_ Sense judici, sense culpa. I un discret “ja has començat” al primer pas. Encara encallat? Demana un pas encara més petit. I si tornes més tard, reprèn allà on ho vas deixar.

L’escenari calmat al voltant:

- **Mode Focus** — una sola tasca omple la pantalla; la resta s’amaga. Un cercle que respira t’ancora.
- **Captura sense fricció** — brain dump en un sol camp; classifica en tres calaixos `Ara` / `Després` / `Algun dia`. Sense dates, a propòsit.
- **Recompensa calmada** — un instant sàlvia en acabar i un recompte del dia. Sense ratxes ni pressió.
- **100% local i instal·lable** — les dades no surten mai del dispositiu; funciona offline com a PWA.

## Una sessió real

**Tasca:** _Preparar la revisió mensual del servei_

> → Obre la presentació del mes passat — _fet_
> → Llegeix la diapositiva de conclusions — _fet_
> → Escriu un punt de millora

No has planificat tota la revisió. Simplement l’has començat.

## Per a qui és

Persones amb **TDAH** · estudiants · professionals del coneixement · qualsevol que se senti aclaparat per una tasca gran.

## Decisions tècniques interessants

- **Local-first com a garantia legal.** Cap backend de dades, sense comptes → sense RGPD. IndexedDB és l’únic magatzem; `requestPersistence()` el fa durador. Portabilitat honesta: export/import en JSON que controles tu.
- **La clau d’IA no arriba mai al navegador.** El desglossament corre en una funció serverless (`api/breakdown.ts`) que guarda `ANTHROPIC_API_KEY` al servidor i crida Claude (`claude-sonnet-4-6`) amb **structured outputs** (un esquema JSON que força `{ steps }`). Sonnet i no pas el Haiku, més barat, a propòsit: l’app és català-first i el model petit inventava paraules; a aquesta escala el sobrecost és menyspreable.
- **Control de cost i abús d’un endpoint d’IA públic.** Un rate limiter compartit (Upstash Redis) aplica una quota diària per dispositiu (el pla gratuït) més sostres diari i de ràfega per IP — només comptadors anònims, cap dada d’usuari — darrere d’una comprovació de mateix origen, amb un sostre de despesa d’Anthropic com a límit dur. En superar la quota, degrada amablement a un heurístic local i un missatge “demà torna”.
- **Degradació elegant.** Si l’endpoint falla, es bloqueja o se supera la quota, el client cau a un heurístic local i la UX no es trenca mai.
- **`done` es desa com a `0 | 1`, no booleà** — IndexedDB no pot indexar booleans; les consultes fan `.where('done').equals(0|1)`.
- **Calaixos en lloc de dates** — una decisió de producte codificada al model de dades per evitar l’angoixa dels terminis.
- **Accessibilitat i calma** — tot respecta `prefers-reduced-motion`.
- **Mesurar l’èxit sense trair el local-first.** La north-star és el **started-rate**: de tots els primers passos mostrats, quants es fan de debò. Es mesura amb dos comptadors globals i anònims a Upstash (`api/event.ts`) — **sense cap contingut, sense cap identificador, només un `+1`** — així la promesa de privacitat es manté.

## Mesurar si funciona

**started-rate = `m:started:total` / `m:shown:total`** — de tots els primers passos mostrats, quants es fan.

Llegeix-ho a la consola d’Upstash → `onething-redis` → **Data Browser** → filtre `m:*`:

- `m:shown:total` — primers passos mostrats _(denominador)_
- `m:started:total` — sessions on s’ha completat el primer pas _(numerador)_

Aquests comptadors **no caduquen**, així que són l’històric de debò — a diferència de les claus de quota diària `q:dev:*` (TTL ~25 h) o de la retenció de logs gratuïta de Vercel (~30 min). Els pings són best-effort: el número és aproximat (un senyal de validació, no comptabilitat) i no diu res de _qui_ ni _què_ — anònim a propòsit.

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
