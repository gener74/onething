# onething — una cosa a la vegada

Eina de focus **calmada, minimalista i local-first** per a cervells amb TDAH.
Mostra NOMÉS una cosa a la vegada; la resta desapareix.

## Filosofia

- **Una cosa a la vegada.** El mode focus ensenya una sola tasca.
- **Fricció zero** en capturar (brain dump amb un sol camp).
- **Calma, no soroll.** To "spa digital"; respecta `prefers-reduced-motion`.
- **Local-first.** Cap dada surt del dispositiu: sense backend de dades, sense
  comptes. Les tasques viuen a IndexedDB del navegador. Pots emportar-te-les amb
  Exporta / Importa (un fitxer JSON que controles tu).

## Funcions (v1)

Brain dump · triatge en 3 calaixos (Ara / Després / Algun dia) · mode focus ·
IA que parteix una tasca que paralitza en micro-passos · recompensa.

## Desenvolupament

```bash
npm run dev      # servidor de desenvolupament (http://localhost:5173)
npm run build    # tsc -b && vite build (typecheck + build + PWA)
npm run lint     # eslint
```

La funció serverless `api/breakdown.ts` (la IA real) necessita una clau de Claude
a `ANTHROPIC_API_KEY` i s'executa amb `vercel dev` o desplegada. Sense ella,
l'app cau a un fallback heurístic local i continua funcionant. Vegeu `.env.example`.

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · Dexie/IndexedDB · vite-plugin-pwa.
Empaquetatge a iOS/Android amb Capacitor previst més endavant.
