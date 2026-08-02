'use client'

// Pantalla de firma (SPEC §11.1 "requiere firma de A5 + evidencia mostrada en
// pantalla", §11.8, §11.12). Se abre desde "Activar envío real" con la MISMA
// evidencia del panel espejo delante — la decisión es una lectura de datos
// propios, no un salto de fe. También enseña la salida (pausar/desconectar)
// en el único momento en que todavía no hay nada que perder (§11.12).

import { useState } from 'react'
import { Pause, PowerOff } from 'lucide-react'
import { Button, Callout, Card, Stat } from '@/shared/components/ui'
import type { Buzon } from './types'
import type { MetricasEspejo } from './espejo'
import { pctSinCambios } from './espejo'
import { SchemaFirmaActivacion } from './validacion'
import { useBuzonStore } from './store'

export function PantallaFirma({
  buzon,
  metricas,
  ahora,
  onCancelar,
}: {
  buzon: Buzon
  metricas: MetricasEspejo
  ahora: string
  onCancelar: () => void
}) {
  const solicitarActivacion = useBuzonStore((s) => s.solicitarActivacion)
  const firmarActivacion = useBuzonStore((s) => s.firmarActivacion)
  const [activadoPor, setActivadoPor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [firmado, setFirmado] = useState(false)

  const confirmar = () => {
    const parsed = SchemaFirmaActivacion.safeParse({ activadoPor })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Falta el nombre de quien firma.')
    if (buzon.estado === 'espejo') {
      const r1 = solicitarActivacion(buzon.id, ahora)
      if (!r1.ok) return setError(r1.motivo)
    }
    const r2 = firmarActivacion(buzon.id, parsed.data.activadoPor, ahora)
    if (!r2.ok) return setError(r2.motivo)
    setError(null)
    setFirmado(true)
  }

  if (firmado) {
    return (
      <Callout tono="success" titulo="Buzón activo" data-testid="firma-confirmada">
        <p className="text-[12px]">{buzon.direccion} ya envía correo real. Pausar/Desconectar siguen siempre visibles en el encabezado.</p>
      </Callout>
    )
  }

  return (
    <Card className="space-y-4 p-4" data-testid="pantalla-firma">
      <div>
        <p className="text-[14px] font-semibold text-ink">Evidencia de {buzon.direccion} en modo espejo</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat etiqueta="Borradores" valor={String(metricas.borradoresGenerados)} />
          <Stat etiqueta="Sin cambios" valor={`${pctSinCambios(metricas)}%`} tono="success" />
          <Stat etiqueta="Con edición" valor={String(metricas.conEdicion)} />
          <Stat etiqueta="Rechazados" valor={String(metricas.rechazados)} tono={metricas.rechazados > 0 ? 'danger' : 'neutral'} />
        </div>
      </div>

      <Callout tono="info" titulo="Cómo detenerlo, si lo necesitas">
        <ul className="space-y-1.5 text-[12px]">
          <li className="flex items-start gap-1.5">
            <Pause className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span><span className="font-medium text-ink">Pausar</span> — deja de enviar de inmediato. Sigue leyendo y redactando. Reversible con un clic. Sin pérdida de contexto.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <PowerOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span><span className="font-medium text-ink">Desconectar</span> — revoca las credenciales del buzón. La bitácora se conserva íntegra para tu auditoría.</span>
          </li>
        </ul>
        <p className="mt-2 text-[11px] text-ink-muted">Ambos quedan siempre visibles en el encabezado, también después de activar.</p>
      </Callout>

      <label className="block text-[13px] font-medium text-ink">
        Firma de A5 — quién activa
        <input
          value={activadoPor}
          onChange={(e) => setActivadoPor(e.target.value)}
          placeholder="Nombre y rol (p. ej. Elisa — CEO)"
          className="input mt-1 w-full text-[13px]"
          data-testid="input-firma-activacion"
        />
      </label>

      {error ? (
        <Callout tono="danger" variante="inline">
          <p className="text-[12px]">{error}</p>
        </Callout>
      ) : null}

      <div className="flex items-center gap-2">
        <Button tamano="sm" onClick={onCancelar}>Cancelar</Button>
        <Button variante="primary" tamano="sm" onClick={confirmar} data-testid="firmar-activacion">
          Firmar y activar envío real
        </Button>
      </div>
    </Card>
  )
}
