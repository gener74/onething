/** Marca d'onething: el cercle que respira (anella + punt sàlvia). */
export function Mark({
  className = '',
  breathe = false,
}: {
  className?: string
  breathe?: boolean
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={`${className}${breathe ? ' animate-breathe' : ''}`}
      aria-hidden="true"
    >
      <circle
        cx="256"
        cy="256"
        r="150"
        fill="none"
        stroke="var(--color-sage)"
        strokeWidth="26"
      />
      <circle cx="256" cy="256" r="46" fill="var(--color-sage-deep)" />
    </svg>
  )
}
