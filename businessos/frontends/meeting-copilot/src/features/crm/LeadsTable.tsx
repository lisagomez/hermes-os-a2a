import { Button, Card, EmptyState, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { EtapaLeadChip } from './EtapaLeadChip'
import { ETAPAS_MOVIBLES, type LeadResumen } from './types'

/**
 * Tabla de leads con la acción de MOVER de etapa: cada fila lleva un <form>
 * (select de etapa + botón) que dispara la server action recibida por props.
 * Recibir la acción como prop mantiene el componente puro y testeable sin
 * navegador (los tests le pasan un stub). Sin JS de cliente: formulario
 * clásico + server action, el embudo se actualiza al revalidar.
 */
export function LeadsTable({
  leads,
  accionMover,
}: {
  leads: LeadResumen[]
  accionMover: (formData: FormData) => Promise<void>
}) {
  if (leads.length === 0) {
    return (
      <EmptyState
        titulo="Sin leads todavía"
        descripcion="Cuando ventas-a2a, la web o un alta manual capturen un lead, aparecerá aquí."
      />
    )
  }

  return (
    <Card className="overflow-x-auto p-0">
      <Table data-testid="crm-leads">
        <THead>
          <TH>Lead</TH>
          <TH>Origen</TH>
          <TH>Canal</TH>
          <TH>Etapa</TH>
          <TH>Mover a</TH>
          <TH>Actualizado</TH>
        </THead>
        <TBody>
          {leads.map((l) => (
            <TRow key={l.lead_id}>
              <TCell>
                <p className="font-medium text-ink">{l.empresa ?? 'Sin empresa'}</p>
                <p className="text-[11px] text-ink-muted">{l.contacto ?? 'sin contacto'}</p>
              </TCell>
              <TCell>
                <code className="font-mono text-[11px] text-ink-secondary">{l.origen}</code>
              </TCell>
              <TCell>
                {/* '—' = el origen no expone canal (a2a/manual/web2 form) */}
                <code className="font-mono text-[11px] text-ink-secondary">{l.canal || '—'}</code>
              </TCell>
              <TCell>
                <EtapaLeadChip etapa={l.etapa} />
              </TCell>
              <TCell>
                <form action={accionMover} className="flex items-center gap-2">
                  <input type="hidden" name="lead_id" value={l.lead_id} />
                  <select
                    name="etapa"
                    defaultValue={l.etapa}
                    className="rounded-s border border-line bg-surface px-2 py-1 text-[12px] text-ink focus:border-accent focus:outline-none"
                  >
                    {ETAPAS_MOVIBLES.map((e) => (
                      <option key={e} value={e}>
                        {e.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <Button variante="secondary" tamano="sm" type="submit">
                    Mover
                  </Button>
                </form>
              </TCell>
              <TCell className="whitespace-nowrap text-[12px] text-ink-secondary">
                {l.updated_at.slice(0, 16).replace('T', ' ')}
              </TCell>
            </TRow>
          ))}
        </TBody>
      </Table>
    </Card>
  )
}
