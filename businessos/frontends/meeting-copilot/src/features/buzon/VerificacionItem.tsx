'use client'

// Componente ÚNICO que renderiza el contrato de verificación (SPEC §11.2). Lo
// usan las pantallas 2 (proveedor), 3 (dominio) y el resto de consumidores de
// `Verificacion` — nunca se reimplementa el render en cada pantalla.
//
// Reglas de la spec, aplicadas aquí y solo aquí:
// - `en_curso`/`esperando_tercero` hacen polling SOLOS (useEffect + intervalo);
//   el botón de "Reintentar ahora" es solo para adelantarlo, nunca obligatorio.
// - `fallido` SIEMPRE trae `accion` (invariante de verificacion.ts) — si no la
//   trae, este componente lo señala como un dato inconsistente en vez de
//   fingir que no pasa nada.
// - `detalleTecnico` colapsado por defecto.

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { Button, Chip } from '@/shared/components/ui'
import { ETIQUETA_VERIFICACION, requierePolling, verificacionValida } from './verificacion'
import type { EstadoVerificacion, Verificacion } from './verificacion'

const ICONO_ESTADO: Record<EstadoVerificacion, typeof CheckCircle2> = {
  pendiente: Clock,
  en_curso: Loader2,
  verificado: CheckCircle2,
  esperando_tercero: Clock,
  fallido: AlertTriangle,
}

const TONO_ESTADO: Record<EstadoVerificacion, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  pendiente: 'neutral',
  en_curso: 'info',
  verificado: 'success',
  esperando_tercero: 'warning',
  fallido: 'danger',
}

// Tailwind necesita las clases COMPLETAS y literales en el fuente para
// incluirlas en el CSS compilado (v4 escanea el código, no evalúa strings en
// runtime) — nunca `text-${variable}`.
const TEXTO_ESTADO: Record<EstadoVerificacion, string> = {
  pendiente: 'text-ink-muted',
  en_curso: 'text-info',
  verificado: 'text-success',
  esperando_tercero: 'text-warning',
  fallido: 'text-danger',
}

const ETIQUETA_ESTADO: Record<EstadoVerificacion, string> = {
  pendiente: 'Pendiente',
  en_curso: 'Verificando…',
  verificado: 'Verificado',
  esperando_tercero: 'Esperando a un tercero',
  fallido: 'Falló',
}

/** Polling automático: mientras el estado lo requiera, tiquea cada
 *  `intervaloMs` llamando `onPoll`. El cliente nunca tiene que presionar
 *  nada — solo existe "Reintentar ahora" para adelantarlo. */
function usePollingAutomatico(estado: EstadoVerificacion, intervaloMs: number, onPoll: () => void) {
  useEffect(() => {
    if (!requierePolling(estado)) return
    const id = setInterval(onPoll, intervaloMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, intervaloMs])
}

export function VerificacionItem({
  verificacion,
  onPoll,
  onAccion,
  intervaloMs = 30000,
}: {
  verificacion: Verificacion
  /** Un paso de avance automático (el mismo que dispara "Reintentar ahora"). */
  onPoll: () => void
  /** El cliente activó la `accion` adjunta (copiar/abrir_url/reintentar/delegar/omitir). */
  onAccion?: (accion: NonNullable<Verificacion['accion']>) => void
  intervaloMs?: number
}) {
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  usePollingAutomatico(verificacion.estado, intervaloMs, onPoll)

  const Icono = ICONO_ESTADO[verificacion.estado]
  const inconsistente = !verificacionValida(verificacion)

  return (
    <div className="space-y-1.5 rounded-s border border-line-subtle p-3" data-testid="verificacion-item" data-verificacion={verificacion.id} data-estado={verificacion.estado}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono className={`h-4 w-4 shrink-0 ${verificacion.estado === 'en_curso' ? 'animate-spin' : ''} ${TEXTO_ESTADO[verificacion.estado]}`} />
          <span className="text-[13px] font-semibold text-ink">{ETIQUETA_VERIFICACION[verificacion.id]}</span>
        </div>
        <Chip tono={TONO_ESTADO[verificacion.estado]}>{ETIQUETA_ESTADO[verificacion.estado]}</Chip>
      </div>

      <p className="text-[12px] text-ink-secondary">{verificacion.mensaje}</p>

      {requierePolling(verificacion.estado) ? (
        <p className="text-[11px] text-ink-muted">
          Revisando cada {Math.round(intervaloMs / 1000)} s · última revisión {new Date(verificacion.ultimaRevision).toLocaleTimeString('es-MX')}
        </p>
      ) : null}

      {inconsistente ? (
        <p className="text-[11px] font-medium text-danger" data-testid="verificacion-inconsistente">
          Dato inconsistente: un estado &quot;fallido&quot; sin acción de corrección. Repórtalo — no debería pasar.
        </p>
      ) : null}

      {verificacion.detalleTecnico ? (
        <div>
          <button
            type="button"
            onClick={() => setDetalleAbierto((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink"
            data-testid="toggle-detalle-tecnico"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${detalleAbierto ? 'rotate-180' : ''}`} />
            Detalle técnico (para tu equipo de TI)
          </button>
          {detalleAbierto ? <p className="mt-1 rounded-s bg-surface-muted p-2 font-mono text-[11px] text-ink-secondary">{verificacion.detalleTecnico}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {verificacion.accion ? (
          <Button
            tamano="sm"
            variante={verificacion.accion.tipo === 'reintentar' ? 'secondary' : 'primary'}
            onClick={() => onAccion?.(verificacion.accion!)}
            data-testid={`accion-verificacion-${verificacion.id}`}
          >
            {verificacion.accion.tipo === 'copiar' ? <Copy className="mr-1 inline h-3 w-3" /> : null}
            {verificacion.accion.tipo === 'abrir_url' ? <ExternalLink className="mr-1 inline h-3 w-3" /> : null}
            {verificacion.accion.etiqueta}
          </Button>
        ) : null}
        {requierePolling(verificacion.estado) ? (
          <Button tamano="sm" variante="ghost" onClick={onPoll} data-testid={`adelantar-${verificacion.id}`}>
            Reintentar ahora
          </Button>
        ) : null}
      </div>
    </div>
  )
}
