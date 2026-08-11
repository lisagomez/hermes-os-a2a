/**
 * Stepper de presentación para los intakes guiados. No lleva estado propio:
 * el formulario (client component) controla `actual`, así el stepper sigue
 * siendo usable también desde server components.
 */

export function Stepper({
  pasos,
  actual,
}: {
  pasos: string[]
  /** Índice 0-based del paso activo. */
  actual: number
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {pasos.map((paso, indice) => {
        const activo = indice === actual
        const completado = indice < actual
        return (
          <li key={paso} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                activo
                  ? 'bg-accent text-accent-ink'
                  : completado
                    ? 'bg-accent-muted text-accent'
                    : 'bg-surface-muted text-ink-muted'
              }`}
              aria-current={activo ? 'step' : undefined}
            >
              {indice + 1}
            </span>
            <span
              className={`text-sm ${
                activo ? 'font-semibold text-ink' : 'text-ink-secondary'
              }`}
            >
              {paso}
            </span>
            {indice < pasos.length - 1 ? (
              <span aria-hidden className="mx-1 h-px w-6 bg-line-strong" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
