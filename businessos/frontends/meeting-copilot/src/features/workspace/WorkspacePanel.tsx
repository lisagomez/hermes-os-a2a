'use client'

import { useState } from 'react'
import { Check, ClipboardCopy, Mail, NotebookPen, ShieldAlert, Users } from 'lucide-react'
import type { AnalisisReunion } from '@/features/insights/engine'
import type { Reunion, Transcripcion } from '@/features/domain/types'
import { useAppStore } from '@/features/domain/store'
import { generarCrmNotes, generarFollowUp, generarRecomendaciones, generarResumenEjecutivo } from './agents'
import { Card, Chip } from '@/shared/components/ui'
import { DesgloseScore } from '@/features/insights/InsightsPanel'

function BotonCopiar({ texto, etiqueta = 'Copiar' }: { texto: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => {
        void navigator.clipboard.writeText(texto).then(() => {
          setCopiado(true)
          setTimeout(() => setCopiado(false), 1600)
        })
      }}
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {copiado ? 'Copiado' : etiqueta}
    </button>
  )
}

export function WorkspacePanel({
  reunion,
  transcripcion,
  analisis,
}: {
  reunion: Reunion
  transcripcion: Transcripcion
  analisis: AnalisisReunion
}) {
  const { accionesEstado, setAccionEstado } = useAppStore()
  const resumen = generarResumenEjecutivo(reunion, analisis)
  const followUp = generarFollowUp(reunion, analisis)
  const crm = generarCrmNotes(reunion, analisis)
  const recomendaciones = generarRecomendaciones(reunion, analisis, transcripcion)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Card className="p-4" >
          <h2 className="mb-2 text-sm font-semibold text-ink">Executive summary</h2>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink" data-testid="executive-summary">{resumen}</p>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Action items</h2>
          {analisis.acciones.length === 0 ? (
            <p className="text-[12px] text-ink-secondary">La reunión cerró sin compromisos detectados — eso ya es un dato: acuerda el siguiente paso.</p>
          ) : (
            <ul className="divide-y divide-line-subtle">
              {analisis.acciones.map((a) => {
                const estado = accionesEstado[`${reunion.id}:${a.id}`] ?? a.estado
                return (
                  <li key={a.id} className="flex items-start gap-3 py-2" data-testid="accion">
                    <input
                      type="checkbox"
                      checked={estado === 'hecha'}
                      onChange={(e) => setAccionEstado(reunion.id, a.id, e.target.checked ? 'hecha' : 'pendiente')}
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] ${estado === 'hecha' ? 'text-ink-muted line-through' : 'text-ink'}`}>{a.tarea}</p>
                      <p className="text-[11px] text-ink-muted">
                        {a.id} · {a.responsable ?? 'sin responsable'} · {a.fechaTexto ?? 'sin fecha'} · fuente {a.fuente}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4" id="followup">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-ink">Follow-up (draft)</h2>
            </div>
            <BotonCopiar texto={`${followUp.asunto}\n\n${followUp.cuerpo}`} />
          </div>
          <p className="text-[12px] text-ink-muted">
            Draft para editar y enviar desde tu correo — el copiloto no envía nada (el envío real pasará por aprobación humana).
          </p>
          <div className="mt-2 rounded-lg bg-surface-muted p-3">
            <p className="text-[13px] font-semibold text-ink">Asunto: {followUp.asunto}</p>
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink" data-testid="followup-cuerpo">{followUp.cuerpo}</p>
          </div>
        </Card>

        <Card className="p-4" id="crm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-ink">CRM notes</h2>
            </div>
            <BotonCopiar texto={crm.notas} />
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Chip tono="accent">etapa sugerida: {crm.etapaSugerida}</Chip>
            <span className="text-[12px] text-ink-secondary">{crm.justificacionEtapa}</span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-muted p-3 font-sans text-[13px] leading-relaxed text-ink" data-testid="crm-notas">
            {crm.notas}
          </pre>
        </Card>
      </div>

      <div className="space-y-4">
        <DesgloseScore reunionId={reunion.id} score={analisis.score} />

        <Card className="p-4" id="riesgos">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-danger" />
            <h2 className="text-sm font-semibold text-ink">Riesgos del deal</h2>
          </div>
          {analisis.riesgos.length === 0 ? (
            <p className="text-[12px] text-ink-secondary">Sin riesgos detectados por las reglas actuales.</p>
          ) : (
            <ul className="space-y-2.5">
              {analisis.riesgos.map((r) => (
                <li key={r.tipo} className="rounded-lg bg-surface-muted p-2.5" data-testid={`riesgo-${r.tipo}`}>
                  <div className="flex items-center gap-2">
                    <Chip tono={r.severidad === 'alta' ? 'danger' : r.severidad === 'media' ? 'warning' : 'neutral'}>{r.severidad}</Chip>
                    <span className="text-[12px] font-medium text-ink">{r.tipo.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-secondary">{r.descripcion}</p>
                  <p className="mt-1 text-[12px] text-ink">→ {r.mitigacion}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4" id="stakeholders">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-info" />
            <h2 className="text-sm font-semibold text-ink">Mapa de stakeholders</h2>
          </div>
          <ul className="space-y-2">
            {analisis.stakeholders.map((s) => (
              <li key={s.nombre} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-2.5 py-2">
                <div>
                  <p className="text-[13px] font-medium text-ink">{s.nombre}</p>
                  <p className="text-[11px] text-ink-muted">{s.rol}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Chip tono={s.influencia === 'decisor' ? 'accent' : 'neutral'}>{s.influencia}</Chip>
                  {!s.presente && <Chip tono="warning">no presente</Chip>}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Antes de la siguiente reunión</h2>
          <ul className="list-inside list-disc space-y-1.5 text-[13px] text-ink" data-testid="recomendaciones">
            {recomendaciones.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
