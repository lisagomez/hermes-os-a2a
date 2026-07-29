'use client'

// Editor de disponibilidad semanal (patrón Calendly): franjas recurrentes por
// día con inputs time NATIVOS en la TZ del asesor (la TZ se muestra explícita),
// duración de sesión default y buffer entre citas.

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, Chip, PillToggle } from '@/shared/components/ui'
import type { Asesor, FranjaDia, ReglaDia } from './types'
import { useAgendaStore } from './store'

const DIAS: { dia: ReglaDia['dia']; etiqueta: string }[] = [
  { dia: 1, etiqueta: 'Lunes' },
  { dia: 2, etiqueta: 'Martes' },
  { dia: 3, etiqueta: 'Miércoles' },
  { dia: 4, etiqueta: 'Jueves' },
  { dia: 5, etiqueta: 'Viernes' },
  { dia: 6, etiqueta: 'Sábado' },
  { dia: 0, etiqueta: 'Domingo' },
]

const DURACIONES = [30, 45, 60] as const
const BUFFERS = [0, 10, 15] as const

export function EditorDisponibilidad({ asesor }: { asesor: Asesor }) {
  // Selector estable (sin `?? []` que fabrique un array nuevo por render).
  const disponibilidad = useAgendaStore((s) => s.disponibilidad)
  const reglasGuardadas = disponibilidad.find((d) => d.asesorId === asesor.id)?.reglas ?? []
  const guardarDisponibilidad = useAgendaStore((s) => s.guardarDisponibilidad)
  const guardarAjustesAsesor = useAgendaStore((s) => s.guardarAjustesAsesor)

  const [borrador, setBorrador] = useState<ReglaDia[]>(reglasGuardadas)
  const [guardado, setGuardado] = useState(false)

  const franjasDe = (dia: ReglaDia['dia']): FranjaDia[] => borrador.find((r) => r.dia === dia)?.franjas ?? []

  const setFranjas = (dia: ReglaDia['dia'], franjas: FranjaDia[]) => {
    setGuardado(false)
    setBorrador((prev) => {
      const sin = prev.filter((r) => r.dia !== dia)
      return franjas.length === 0 ? sin : [...sin, { dia, franjas }]
    })
  }

  const editarFranja = (dia: ReglaDia['dia'], idx: number, campo: keyof FranjaDia, valor: string) => {
    const franjas = franjasDe(dia).map((f, i) => (i === idx ? { ...f, [campo]: valor } : f))
    setFranjas(dia, franjas)
  }

  return (
    <Card className="p-4" data-testid="editor-disponibilidad">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">Disponibilidad semanal</h2>
          <p className="text-[12px] text-ink-secondary">
            Horas en la zona del asesor: <span className="font-medium text-ink">{asesor.zonaHoraria}</span>
          </p>
        </div>
        <Button
          variante="primary"
          tamano="sm"
          data-testid="guardar-disponibilidad"
          onClick={() => {
            guardarDisponibilidad(asesor.id, borrador)
            setGuardado(true)
          }}
        >
          Guardar disponibilidad
        </Button>
      </div>

      {guardado ? <Chip tono="success">Guardada</Chip> : null}

      <div className="mt-2 space-y-2">
        {DIAS.map(({ dia, etiqueta }) => {
          const franjas = franjasDe(dia)
          return (
            <div key={dia} className="flex flex-wrap items-start gap-3 border-b border-line-subtle py-2 last:border-b-0">
              <p className="w-20 pt-1.5 text-[12px] font-medium text-ink">{etiqueta}</p>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {franjas.length === 0 ? (
                  <p className="pt-1.5 text-[12px] text-ink-muted">Sin atención</p>
                ) : (
                  franjas.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="time" value={f.inicio} onChange={(e) => editarFranja(dia, i, 'inicio', e.target.value)} className="input w-28" aria-label={`${etiqueta}: inicio de franja ${i + 1}`} />
                      <span className="text-[12px] text-ink-muted">a</span>
                      <input type="time" value={f.fin} onChange={(e) => editarFranja(dia, i, 'fin', e.target.value)} className="input w-28" aria-label={`${etiqueta}: fin de franja ${i + 1}`} />
                      <Button variante="ghost" tamano="sm" title="Quitar franja" onClick={() => setFranjas(dia, franjas.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <Button
                variante="ghost"
                tamano="sm"
                title={`Añadir franja a ${etiqueta}`}
                data-testid={`agregar-franja-${dia}`}
                onClick={() => setFranjas(dia, [...franjas, { inicio: '09:00', fin: '13:00' }])}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-ink-secondary">Duración de sesión</p>
          <PillToggle
            opciones={DURACIONES.map((d) => ({ id: String(d), contenido: `${d} min` }))}
            valor={String(asesor.duracionDefaultMin)}
            onCambio={(v) => guardarAjustesAsesor(asesor.id, { duracionDefaultMin: Number(v) as 30 | 45 | 60, bufferMin: asesor.bufferMin })}
            etiqueta="Duración de sesión por defecto"
            claseBoton="px-2.5 py-1 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-ink-secondary">Buffer entre citas</p>
          <PillToggle
            opciones={BUFFERS.map((b) => ({ id: String(b), contenido: `${b} min` }))}
            valor={String(asesor.bufferMin)}
            onCambio={(v) => guardarAjustesAsesor(asesor.id, { duracionDefaultMin: asesor.duracionDefaultMin, bufferMin: Number(v) })}
            etiqueta="Buffer entre citas"
            claseBoton="px-2.5 py-1 text-[12px]"
          />
        </div>
      </div>
    </Card>
  )
}
