import type { CSSProperties } from 'react'

/**
 * Fons relaxant per a l'estat buit: unes poques fulles de tardor que cauen lentes
 * i deriven, en bucle continu (no s'acumulen). Tons de tardor via emoji 🍁 / 🍂.
 * Poques i lentes a propòsit (calma). Es desactiven soles amb `prefers-reduced-motion`.
 */

// Paràmetres fixos (no aleatoris) perquè no "saltin" en cada render.
const LEAVES = [
  { left: '6%', size: 26, delay: 0, dur: 16, drift: 32, char: '🍁' },
  { left: '19%', size: 34, delay: 6, dur: 20, drift: -26, char: '🍂' },
  { left: '34%', size: 22, delay: 3, dur: 14, drift: 40, char: '🍁' },
  { left: '48%', size: 30, delay: 9, dur: 22, drift: -34, char: '🍁' },
  { left: '62%', size: 24, delay: 1, dur: 17, drift: 28, char: '🍂' },
  { left: '76%', size: 36, delay: 7, dur: 21, drift: -30, char: '🍁' },
  { left: '89%', size: 24, delay: 4, dur: 18, drift: 36, char: '🍁' },
  { left: '28%', size: 20, delay: 12, dur: 15, drift: -22, char: '🍂' },
]

/**
 * `eager`: sembra les fulles ja a mig caure (delay negatiu, repartit) perquè la
 * pluja hi sigui A L'INSTANT. Útil en pantalles transitòries —com la porta del
 * primer contacte— que l'usuari travessa en pocs segons, abans que la seqüència
 * lenta (delays de fins a 12s) arrenqui. A l'estat buit no cal: t'hi quedes i
 * s'omple sola, i el ritme pausat és part de la calma.
 */
export function Leaves({ eager = false }: { eager?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {LEAVES.map((l, i) => {
        // Delay negatiu = l'animació arrenca "com si ja portés estona", amb la
        // fulla ja dins la seva caiguda. Repartim el punt d'inici dins el TRAM
        // OPAC del bucle (~20–75%, entre el fade-in i el fade-out) perquè totes
        // surtin ja visibles, no a mig aparèixer.
        const frac = 0.2 + (i / (LEAVES.length - 1)) * 0.55
        const delay = eager ? -frac * l.dur : l.delay
        return (
          <span
            key={i}
            className="leaf"
            style={
              {
                left: l.left,
                fontSize: l.size,
                lineHeight: 1,
                '--drift': `${l.drift}px`,
                animationDuration: `${l.dur}s`,
                animationDelay: `${delay}s`,
              } as CSSProperties
            }
          >
            {l.char}
          </span>
        )
      })}
    </div>
  )
}
