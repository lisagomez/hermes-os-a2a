'use client'

import { useState } from 'react'
import { BookOpenCheck } from 'lucide-react'
import { useAppStore } from '@/features/domain/store'
import { ETIQUETA_DIMENSION, ETIQUETA_TIPO_REUNION, type Playbook } from '@/features/domain/types'
import { Card, Chip, SectionHeader } from '@/shared/components/ui'

function EditorPlaybook({ playbook }: { playbook: Playbook }) {
  const actualizar = useAppStore((s) => s.actualizarPlaybook)
  const suma = playbook.dimensiones.reduce((a, d) => a + d.peso, 0)

  const cambiarPeso = (dimension: string, peso: number) => {
    actualizar({
      ...playbook,
      dimensiones: playbook.dimensiones.map((d) => (d.dimension === dimension ? { ...d, peso } : d)),
    })
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BookOpenCheck className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-ink">{playbook.nombre}</h2>
        <Chip>{ETIQUETA_TIPO_REUNION[playbook.tipoReunion]}</Chip>
        <Chip tono={suma === 100 ? 'success' : 'danger'}>Σ pesos: {suma}</Chip>
        {suma !== 100 && <span className="text-[12px] text-danger">Los pesos deben sumar 100 — el score usa esta suma.</span>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Dimensiones y pesos</h3>
          <ul className="space-y-1.5">
            {playbook.dimensiones.map((d) => (
              <li key={d.dimension} className="flex items-center gap-2 rounded-lg bg-surface-muted px-2.5 py-1.5">
                <span className="flex-1 text-[13px] text-ink">{ETIQUETA_DIMENSION[d.dimension]}</span>
                {d.critica && <Chip tono="accent">crítica</Chip>}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={d.peso}
                  onChange={(e) => cambiarPeso(d.dimension, Number(e.target.value))}
                  className="input w-16 text-right"
                  aria-label={`Peso de ${ETIQUETA_DIMENSION[d.dimension]}`}
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Banco de preguntas (por prioridad)</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {playbook.dimensiones.map((d) => (
              <div key={d.dimension}>
                <p className="text-[12px] font-medium text-ink">{ETIQUETA_DIMENSION[d.dimension]}</p>
                <ul className="mt-0.5 list-inside list-disc space-y-0.5">
                  {playbook.bancoPreguntas[d.dimension].map((q) => (
                    <li key={q} className="text-[12px] text-ink-secondary">{q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function PlaybooksView() {
  const playbooks = useAppStore((s) => s.playbooks)
  const [activo, setActivo] = useState(playbooks[0]?.id ?? '')
  const seleccionado = playbooks.find((p) => p.id === activo) ?? playbooks[0]

  return (
    <div className="space-y-4">
      <SectionHeader
        titulo="Playbooks & Templates"
        descripcion="El playbook define qué dimensiones pesan, cuáles son críticas y qué pregunta el coach. El score y el Guided Meeting los leen en vivo."
      />
      <div className="flex flex-wrap gap-2">
        {playbooks.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivo(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              seleccionado?.id === p.id ? 'border-accent bg-accent-muted text-accent' : 'border-line bg-surface text-ink-secondary hover:text-ink'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>
      {seleccionado && <EditorPlaybook playbook={seleccionado} />}

      <Card className="p-4" id="templates">
        <h2 className="mb-2 text-sm font-semibold text-ink">Templates de salida</h2>
        <p className="text-[12px] text-ink-secondary">
          Los templates de follow-up, CRM notes y resumen se generan con los agentes del workspace a partir del análisis
          (misma estructura para todo el equipo). En el roadmap: templates editables por tipo de reunión y por marca
          (white-label).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip>Executive summary</Chip>
          <Chip>Follow-up email</Chip>
          <Chip>CRM notes</Chip>
          <Chip>Recomendaciones de coaching</Chip>
        </div>
      </Card>
    </div>
  )
}
