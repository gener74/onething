import type { CSSProperties } from 'react'

/**
 * Fons relaxant per a l'estat buit: unes poques fulles de sàlvia que cauen lentes
 * i deriven. Poques i suaus a propòsit (calma, no soroll). Es desactiven soles amb
 * `prefers-reduced-motion` (vegeu .leaf a index.css).
 */

// Paràmetres fixos (no aleatoris) perquè no "saltin" en cada render.
const LEAVES = [
  { left: '6%', size: 11, delay: 0, dur: 15, drift: 28 },
  { left: '18%', size: 15, delay: 6, dur: 19, drift: -22 },
  { left: '34%', size: 9, delay: 3, dur: 13, drift: 36 },
  { left: '48%', size: 14, delay: 9, dur: 21, drift: -30 },
  { left: '62%', size: 10, delay: 1, dur: 16, drift: 24 },
  { left: '76%', size: 16, delay: 7, dur: 20, drift: -26 },
  { left: '88%', size: 12, delay: 4, dur: 17, drift: 32 },
  { left: '28%', size: 8, delay: 11, dur: 14, drift: -18 },
]

export function Leaves() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="leaf"
          style={
            {
              left: l.left,
              width: l.size,
              height: l.size,
              animationDuration: `${l.dur}s`,
              animationDelay: `${l.delay}s`,
              '--drift': `${l.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
