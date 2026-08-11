import type { EstadoValidacion, Fuente } from '@/shared/types'

/**
 * Indicadores de confianza — condición de adopción del socio fiscal
 * (INVESTIGACION-SINTESIS.md, principio 2): toda salida del sistema muestra
 * de dónde viene (HermesTag/GrafoTag), qué la respalda (FuentesFooter) y en
 * qué estado de validación humana está (ValidacionChip).
 *
 * Decisión C4: la validación humana es estado de FLUJO — fichas neutras o de
 * acento, jamás la paleta de riesgo.
 */

function EtiquetaOrigen({ texto }: { texto: string }) {
  return (
    <span className="inline-flex items-center rounded-control border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.15em] text-ink-secondary">
      {texto}
    </span>
  )
}

/** Marca una sección/salida generada por el agente Hermes. */
export function HermesTag() {
  return <EtiquetaOrigen texto="HERMES" />
}

/** Marca una afirmación respaldada por el grafo regulatorio. */
export function GrafoTag() {
  return <EtiquetaOrigen texto="GRAFO" />
}

export function ValidacionChip({ estado }: { estado: EstadoValidacion }) {
  const estilos: Record<EstadoValidacion, { clases: string; etiqueta: string }> = {
    validado: {
      clases: 'bg-accent-muted text-accent',
      etiqueta: 'Validado por humano',
    },
    en_revision: {
      clases: 'bg-surface-muted text-ink-secondary',
      etiqueta: 'En revisión',
    },
    pendiente: {
      clases: 'bg-surface-muted text-ink-muted',
      etiqueta: 'Pendiente de validación',
    },
  }
  const { clases, etiqueta } = estilos[estado]
  return (
    <span
      className={`inline-flex items-center rounded-control px-2.5 py-0.5 text-xs font-medium ${clases}`}
    >
      {etiqueta}
    </span>
  )
}

/**
 * Pie de confianza para toda tarjeta generada por el sistema: lista de
 * fuentes con su origen, estado de validación y disclaimer fijo.
 */
export function FuentesFooter({
  fuentes,
  estado,
}: {
  fuentes: Fuente[]
  estado?: EstadoValidacion
}) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {estado ? <ValidacionChip estado={estado} /> : null}
        {fuentes.map((fuente) => (
          <span
            key={`${fuente.origen}-${fuente.referencia}`}
            className="inline-flex items-center gap-1.5 text-xs text-ink-secondary"
          >
            {fuente.origen === 'grafo' ? <GrafoTag /> : <HermesTag />}
            {fuente.url ? (
              <a
                href={fuente.url}
                className="underline decoration-line-strong underline-offset-2 hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                {fuente.referencia}
              </a>
            ) : (
              <span>{fuente.referencia}</span>
            )}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
        No constituye asesoría legal. Criterio sujeto a validación humana antes
        de usarse con un cliente.
      </p>
    </div>
  )
}
