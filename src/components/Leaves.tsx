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
              fontSize: l.size,
              lineHeight: 1,
              '--drift': `${l.drift}px`,
              animationDuration: `${l.dur}s`,
              animationDelay: `${l.delay}s`,
            } as CSSProperties
          }
        >
          {l.char}
        </span>
      ))}
    </div>
  )
}
