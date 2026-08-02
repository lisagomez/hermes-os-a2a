'use client'

// Modo espejo — la pantalla que vende la activación (SPEC §11.8). El botón
// "Activar envío real" SOLO aparece al cumplir el mínimo (7 días naturales Y
// 20 borradores — `puedeMostrarBotonActivar` reusa el MISMO gate `puedeListo`
// que la máquina de estados, nunca un cálculo paralelo).

import Link from 'next/link'
import { useState } from 'react'
import { Button, Callout, Card, ProgressBar, Stat } from '@/shared/components/ui'
import type { Buzon } from './types'
import { diaEspejo, DIAS_MINIMOS_ESPEJO, metricasDe, pctSinCambios, puedeMostrarBotonActivar } from './espejo'
import { useBuzonStore } from './store'
import { PantallaFirma } from './PantallaFirma'

export function PanelEspejo({ buzon, ahora }: { buzon: Buzon; ahora: string }) {
  const metricasEspejo = useBuzonStore((s) => s.metricasEspejo)
  const [mostrarFirma, setMostrarFirma] = useState(false)

  const m = metricasDe(metricasEspejo, buzon.id)
  const dia = buzon.espejoDesde ? diaEspejo(buzon.espejoDesde, ahora) : 1
  const puedeActivar = puedeMostrarBotonActivar(buzon.espejoDesde, m, ahora)

  if (mostrarFirma) return <PantallaFirma buzon={buzon} metricas={m} ahora={ahora} onCancelar={() => setMostrarFirma(false)} />

  return (
    <div className="space-y-4" data-testid="panel-espejo">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold text-ink">
            Modo espejo · día {Math.min(dia, DIAS_MINIMOS_ESPEJO)} de {DIAS_MINIMOS_ESPEJO}
            {dia > DIAS_MINIMOS_ESPEJO ? ` (+${dia - DIAS_MINIMOS_ESPEJO})` : ''}
          </p>
        </div>
        <ProgressBar valor={(Math.min(dia, DIAS_MINIMOS_ESPEJO) / DIAS_MINIMOS_ESPEJO) * 100} />
        <p className="text-[12px] text-ink-secondary">El agente está leyendo tu correo real y redactando borradores. No se ha enviado ningún correo.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat etiqueta="Borradores generados" valor={String(m.borradoresGenerados)} />
          <Stat etiqueta="Sin cambios" valor={`${m.sinCambios} (${pctSinCambios(m)}%)`} tono="success" />
          <Stat etiqueta="Requirieron edición" valor={String(m.conEdicion)} tono={m.conEdicion > 0 ? 'warning' : 'neutral'} />
          <Stat etiqueta="Rechazados" valor={String(m.rechazados)} tono={m.rechazados > 0 ? 'danger' : 'neutral'} />
        </div>

        {m.verificacionesBloqueadas.length > 0 ? (
          <div>
            <p className="mb-1 text-[12px] font-semibold text-ink">Verificaciones bloqueadas: {m.verificacionesBloqueadas.reduce((a, v) => a + v.cantidad, 0)}</p>
            <ul className="list-inside list-disc text-[12px] text-ink-secondary">
              {m.verificacionesBloqueadas.map((v, i) => (
                <li key={i}>{v.motivo}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href={`/buzon?buzon=${buzon.id}`} className="btn-secondary px-3 py-1.5 text-[13px]" data-testid="ver-borradores-espejo">
            Ver los {m.borradoresGenerados} borradores
          </Link>
          {puedeActivar ? (
            <Button variante="primary" onClick={() => setMostrarFirma(true)} data-testid="activar-envio-real">
              Activar envío real →
            </Button>
          ) : null}
        </div>
      </Card>

      {!puedeActivar ? (
        <Callout tono="info" variante="inline">
          <p className="text-[12px]">
            El botón de activar aparece en cuanto se cumplan los mínimos: {DIAS_MINIMOS_ESPEJO} días naturales en espejo y 20 borradores generados. No hay
            atajo — ni para demos.
          </p>
        </Callout>
      ) : null}
    </div>
  )
}
