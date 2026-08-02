'use client'

// Pantalla 1 del asistente (SPEC §11.3): elegir el tipo de buzón ANTES de
// pedir cualquier credencial. Cada tarjeta dice en lenguaje llano qué hará el
// agente, qué nunca hará y quién aprueba. "Personalizar" es texto secundario:
// aplica una plantilla base y manda a /buzon/politicas a ajustarla a mano.

import Link from 'next/link'
import { useState } from 'react'
import { Ban, CheckCircle2, UserCheck } from 'lucide-react'
import { Button, Callout, Card, Chip } from '@/shared/components/ui'
import { PLANTILLAS_BUZON } from './plantillas'
import type { PlantillaBuzon } from './types'
import { useBuzonStore } from './store'

export function PantallaTipoBuzon({ buzonId, onListo }: { buzonId: string; onListo: () => void }) {
  const elegirPlantilla = useBuzonStore((s) => s.elegirPlantilla)
  const [seleccion, setSeleccion] = useState<PlantillaBuzon | null>(null)
  const [captarLeads, setCaptarLeads] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const def = seleccion ? PLANTILLAS_BUZON.find((p) => p.id === seleccion) : null

  const confirmar = () => {
    if (!seleccion) return setError('Elige un tipo de buzón para continuar.')
    const r = elegirPlantilla(buzonId, seleccion, captarLeads)
    if (!r.ok) return setError(r.motivo)
    setError(null)
    onListo()
  }

  return (
    <div data-testid="pantalla-tipo-buzon">
      <p className="mb-3 text-[13px] text-ink-secondary">
        Antes de pedirte cualquier credencial, elige qué va a hacer este buzón. Puedes personalizarlo después en Políticas.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PLANTILLAS_BUZON.map((p) => {
          const activa = seleccion === p.id
          return (
            <Card
              key={p.id}
              className={`cursor-pointer space-y-2 p-4 ${activa ? 'border-accent ring-1 ring-accent' : ''}`}
              onClick={() => setSeleccion(p.id)}
              data-testid={`plantilla-${p.id}`}
              data-seleccionada={activa}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-ink">{p.nombre}</p>
                {activa ? <CheckCircle2 className="h-4 w-4 text-accent" /> : null}
              </div>
              <p className="text-[12px] text-ink-secondary">
                <span className="font-medium text-ink">Qué hará: </span>
                {p.queHara}
              </p>
              <p className="flex items-start gap-1 text-[12px] text-ink-secondary">
                <Ban className="mt-0.5 h-3 w-3 shrink-0 text-danger" />
                <span>
                  <span className="font-medium text-ink">Nunca hará: </span>
                  {p.queNuncaHara}
                </span>
              </p>
              <p className="flex items-start gap-1 text-[12px] text-ink-secondary">
                <UserCheck className="mt-0.5 h-3 w-3 shrink-0 text-ink-muted" />
                <span>
                  <span className="font-medium text-ink">Quién aprueba: </span>
                  {p.quienAprueba}
                </span>
              </p>
              {p.topeIntercambios !== null ? <Chip>Tope: {p.topeIntercambios} intercambios</Chip> : <Chip tono="neutral">Sin redacción — solo clasifica</Chip>}
            </Card>
          )
        })}
      </div>

      {def?.captarLeadsDisponible ? (
        <label className="mt-4 flex items-center gap-2 text-[13px] text-ink" data-testid="toggle-captar-leads">
          <input type="checkbox" checked={captarLeads} onChange={(e) => setCaptarLeads(e.target.checked)} className="h-4 w-4" />
          Crear un lead cuando escriba alguien nuevo
          <span className="text-[11px] text-ink-muted">(no cambia la etapa si el contacto ya existe)</span>
        </label>
      ) : null}

      {error ? (
        <Callout tono="danger" variante="inline" className="mt-3">
          <p className="text-[12px]">{error}</p>
        </Callout>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button variante="primary" onClick={confirmar} data-testid="confirmar-plantilla">
          Continuar
        </Button>
        <Link href="/buzon/politicas" className="text-[12px] text-ink-secondary hover:underline" data-testid="link-personalizar">
          Personalizar en vez de usar una plantilla →
        </Link>
      </div>
    </div>
  )
}
