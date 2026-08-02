'use client'

// Pantalla 5 del asistente (SPEC §11.7): aprobador y canal. El selector es
// OBLIGATORIO — sin opción "nadie" (§11.13: fricción que NO se elimina, A5 es
// obligatorio por diseño de nivel L3). El suplente es opcional pero
// recomendado, con la razón siempre visible.

import { useState } from 'react'
import { Button, Callout, PillToggle } from '@/shared/components/ui'
import type { Buzon, CanalAprobacion } from './types'
import { SchemaAprobadorCanal } from './validacion'
import { useBuzonStore } from './store'

const CANALES: { id: CanalAprobacion; etiqueta: string }[] = [
  { id: 'telegram', etiqueta: 'Telegram' },
  { id: 'slack', etiqueta: 'Slack' },
  { id: 'panel', etiqueta: 'Solo en el panel' },
]

export function PantallaAprobador({ buzon, onListo }: { buzon: Buzon; onListo: () => void }) {
  const asignarAprobador = useBuzonStore((s) => s.asignarAprobador)
  const [aprobador, setAprobador] = useState('')
  const [canalAprobacion, setCanalAprobacion] = useState<CanalAprobacion>(buzon.canalAprobacion)
  const [aprobadorSuplente, setAprobadorSuplente] = useState('')
  const [error, setError] = useState<string | null>(null)

  const confirmar = () => {
    const parsed = SchemaAprobadorCanal.safeParse({ aprobador, canalAprobacion, aprobadorSuplente: aprobadorSuplente || undefined })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Datos inválidos.')
    setError(null)
    asignarAprobador(buzon.id, parsed.data.aprobador, parsed.data.canalAprobacion, parsed.data.aprobadorSuplente ?? null, new Date().toISOString())
    onListo()
  }

  return (
    <div className="space-y-4" data-testid="pantalla-aprobador">
      <label className="block text-[13px] font-medium text-ink">
        ¿Quién aprueba los correos de este buzón?
        <input
          value={aprobador}
          onChange={(e) => setAprobador(e.target.value)}
          placeholder="Nombre y rol (obligatorio)"
          className="input mt-1 w-full text-[13px]"
          data-testid="input-aprobador"
        />
      </label>

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink">¿Dónde quieres aprobarlos?</p>
        <PillToggle
          opciones={CANALES.map((c) => ({ id: c.id, contenido: c.etiqueta, testid: `canal-${c.id}` }))}
          valor={canalAprobacion}
          onCambio={setCanalAprobacion}
          etiqueta="Canal de aprobación"
        />
      </div>

      <label className="block text-[13px] font-medium text-ink">
        Suplente para vacaciones o ausencias (opcional, muy recomendado)
        <input
          value={aprobadorSuplente}
          onChange={(e) => setAprobadorSuplente(e.target.value)}
          placeholder="Nombre y rol"
          className="input mt-1 w-full text-[13px]"
          data-testid="input-suplente"
        />
      </label>
      <p className="text-[11px] text-ink-muted">
        Sin suplente, la primera ausencia del aprobador convierte el control en bloqueo operativo. Anticiparlo ahora es más barato que discutirlo bajo
        presión.
      </p>

      {error ? (
        <Callout tono="danger" variante="inline">
          <p className="text-[12px]">{error}</p>
        </Callout>
      ) : null}

      <Button variante="primary" onClick={confirmar} data-testid="confirmar-aprobador">
        Continuar
      </Button>
    </div>
  )
}
