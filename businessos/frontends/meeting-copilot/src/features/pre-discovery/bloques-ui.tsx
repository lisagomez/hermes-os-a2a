'use client'

// Renderers de los bloques del caso. Doctrina visual transversal:
// - naturaleza SIEMPRE visible (hecho=success, hipótesis=warning, recomendación=accent)
// - procedencia + confianza en cada bloque (chips), mock declarado
// - estados vacíos/no concluyentes con criterio, jamás huecos genéricos

import { RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Callout, Card, Chip, Button } from '@/shared/components/ui'
import type {
  Bloque,
  BloqueId,
  DatosBrief,
  DatosCompetencia,
  DatosDiferenciacion,
  DatosFoda,
  DatosPerfil,
  DatosSitio,
  DatosTecnologia,
  Item,
  Naturaleza,
} from './types'
import { ETIQUETA_BLOQUE } from './types'
import type { EvaluacionGrafo } from './grafo'
import { Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'

export function ChipNaturaleza({ naturaleza }: { naturaleza: Naturaleza }) {
  return (
    <Chip tono={naturaleza === 'hecho' ? 'success' : naturaleza === 'hipotesis' ? 'warning' : 'accent'}>
      {naturaleza === 'hecho' ? 'hecho' : naturaleza === 'hipotesis' ? 'hipótesis' : 'recomendación'}
    </Chip>
  )
}

export function ItemLinea({ item }: { item: Item }) {
  return (
    <li className="rounded-s bg-surface-muted px-2.5 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-ink">{item.texto}</p>
        <ChipNaturaleza naturaleza={item.naturaleza} />
      </div>
      {item.evidencia && <p className="mt-0.5 text-[11px] italic text-ink-muted">“{item.evidencia}”</p>}
    </li>
  )
}

export function CabeceraBloque({
  id,
  bloque,
  onRegenerar,
  regenerando,
}: {
  id: BloqueId
  bloque: Bloque<unknown>
  onRegenerar?: () => void
  regenerando?: boolean
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold text-ink">{ETIQUETA_BLOQUE[id]}</h2>
      {bloque.estado === 'analizando' && <Chip tono="info">analizando…</Chip>}
      {bloque.estado === 'no_concluyente' && <Chip tono="warning">no concluyente</Chip>}
      {bloque.estado === 'error' && <Chip tono="danger">error</Chip>}
      {bloque.procedencia && (
        <>
          <Chip tono={bloque.procedencia.metodo === 'observado' ? 'success' : bloque.procedencia.metodo === 'inferido' ? 'info' : 'warning'}>
            {bloque.procedencia.metodo}
          </Chip>
          <Chip>confianza {bloque.confianza}</Chip>
          <span className="text-[11px] text-ink-muted" title={bloque.procedencia.fuente}>
            fuente: {bloque.procedencia.fuente.length > 60 ? `${bloque.procedencia.fuente.slice(0, 57)}…` : bloque.procedencia.fuente}
          </span>
        </>
      )}
      {onRegenerar && (
        <Button tamano="sm" className="ml-auto" onClick={onRegenerar} disabled={regenerando} data-testid={`regenerar-${id}`}>
          <RefreshCw className={`h-3 w-3 ${regenerando ? 'animate-spin' : ''}`} /> Regenerar
        </Button>
      )}
    </div>
  )
}

export function AvisosValidacion({ bloque }: { bloque: Bloque<unknown> }) {
  if (bloque.requiereValidacion.length === 0) return null
  return (
    <Callout tono="warning" variante="inline" titulo="Requiere validación humana" className="mt-2">
      <ul className="list-inside list-disc text-[12px]">
        {bloque.requiereValidacion.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </Callout>
  )
}

// ─── Bloques ────────────────────────────────────────────────────────────────

export function PerfilView({ datos }: { datos: DatosPerfil }) {
  return (
    <div className="space-y-2 text-[13px] text-ink">
      <p><span className="font-semibold">{datos.empresaNormalizada}</span> · {datos.industria} · orientación: {datos.orientacion}</p>
      <p>{datos.descripcion}</p>
      <Callout tono="accent" variante="inline" titulo="Resumen ejecutivo">
        <p className="text-[13px]">{datos.resumenEjecutivo}</p>
      </Callout>
    </div>
  )
}

export function SitioView({ datos }: { datos: DatosSitio }) {
  const seccion = (titulo: string, items: Item[]) => (
    <div>
      <h3 className="mb-1 text-[12px] font-semibold text-ink">{titulo}</h3>
      {items.length === 0 ? (
        <p className="text-[12px] text-ink-muted">Sin hallazgos — no se inventa lo que el sitio no muestra.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <ItemLinea key={i.texto} item={i} />
          ))}
        </ul>
      )}
    </div>
  )
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {seccion('Servicios detectados', datos.servicios)}
      <div className="space-y-4">
        {seccion('Propuesta de valor', [datos.propuestaValor])}
        {seccion('Claims comerciales', datos.claims)}
      </div>
      {seccion('Segmentos objetivo', datos.segmentosObjetivo)}
      <div className="space-y-4">
        <div>
          <h3 className="mb-1 text-[12px] font-semibold text-ink">
            Madurez digital <Chip tono={datos.madurezDigital.nivel === 'alta' ? 'success' : datos.madurezDigital.nivel === 'media' ? 'warning' : 'danger'}>{datos.madurezDigital.nivel}</Chip>
          </h3>
          <ul className="space-y-1.5">
            {datos.madurezDigital.senales.map((i) => (
              <ItemLinea key={i.texto} item={i} />
            ))}
          </ul>
        </div>
        {seccion('Vacíos del posicionamiento', datos.vacios)}
      </div>
    </div>
  )
}

export function CompetenciaView({ datos }: { datos: DatosCompetencia }) {
  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <THead>
            <TRow>
              <TH>Competidor</TH>
              <TH>Posicionamiento</TH>
              <TH className="hidden md:table-cell">Diferenciadores</TH>
              <TH>Madurez</TH>
              <TH>Confianza</TH>
            </TRow>
          </THead>
          <TBody>
            {datos.competidores.map((c) => (
              <TRow key={c.nombre}>
                <TCell className="font-medium text-ink">{c.nombre}</TCell>
                <TCell className="text-ink-secondary">{c.posicionamiento}</TCell>
                <TCell className="hidden text-ink-secondary md:table-cell">{c.diferenciadores.join(' · ')}</TCell>
                <TCell><Chip tono={c.madurez === 'alta' ? 'success' : c.madurez === 'media' ? 'warning' : 'neutral'}>{c.madurez}</Chip></TCell>
                <TCell><Chip>{c.confianza}</Chip></TCell>
              </TRow>
            ))}
          </TBody>
        </Table>
      </Card>
      <div>
        <h3 className="mb-1.5 text-[12px] font-semibold text-ink">Lectura del analista (lead vs mercado)</h3>
        <ul className="space-y-1.5">
          {datos.comparativa.map((c) => (
            <li key={c.dimension} className="rounded-s bg-surface-muted px-2.5 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{c.dimension}</p>
              <p className="text-[13px] text-ink"><span className="text-ink-secondary">Lead:</span> {c.lead}</p>
              <p className="mt-0.5 text-[13px] text-ink">{c.lectura}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function EstrategiaView({ dif, foda }: { dif: DatosDiferenciacion | null; foda: DatosFoda | null }) {
  return (
    <div className="space-y-4">
      {dif && (
        <div>
          <h3 className="mb-1.5 text-[12px] font-semibold text-ink">Oportunidades de diferenciación</h3>
          <div className="grid gap-2.5 md:grid-cols-3">
            {dif.oportunidades.map((o) => (
              <Card key={o.titulo} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink">{o.titulo}</p>
                  <ChipNaturaleza naturaleza={o.naturaleza} />
                </div>
                <p className="mt-1 text-[12px] text-ink-secondary">Gap: {o.gapCompetitivo}</p>
                <p className="mt-1 text-[12px] text-ink">→ {o.linea}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
      {foda && (
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ['Fortalezas', foda.fortalezas],
              ['Oportunidades', foda.oportunidades],
              ['Debilidades', foda.debilidades],
              ['Amenazas', foda.amenazas],
            ] as const
          ).map(([titulo, items]) => (
            <Card key={titulo} className="p-3">
              <h3 className="mb-1.5 text-[12px] font-semibold text-ink">{titulo}</h3>
              {items.length === 0 ? (
                <p className="text-[12px] text-ink-muted">Sin elementos con respaldo.</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((i) => (
                    <ItemLinea key={i.texto} item={i} />
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function RegulatorioView({ datos }: { datos: EvaluacionGrafo }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tono={datos.estado === 'permitido' || datos.estado === 'deducible' ? 'success' : datos.estado === 'dudoso' ? 'warning' : 'danger'}>
          {datos.estado}
        </Chip>
        <Chip tono={datos.conexion === 'grafo' ? 'success' : 'warning'}>{datos.conexion === 'grafo' ? 'grafo regulatorio' : 'mock fiel del grafo'}</Chip>
        <Chip>{datos.contexto.jurisdiccion} · {datos.contexto.dimension}</Chip>
      </div>
      <ul className="space-y-2">
        {datos.conceptos.map((c) => (
          <li key={c.descripcion} className="rounded-s bg-surface-muted px-3 py-2" data-testid="concepto-regulatorio">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] text-ink">{c.descripcion}</p>
              <Chip tono={c.estado === 'dudoso' ? 'warning' : c.estado.startsWith('no_') ? 'danger' : 'success'}>{c.estado}</Chip>
            </div>
            <p className="mt-0.5 text-[12px] text-ink-secondary">{c.razon}</p>
            {c.fuente ? (
              <a href={c.fuente.url} target="_blank" rel="noreferrer" className="mt-0.5 block text-[11px] text-accent hover:underline">
                {c.fuente.clave} — {c.fuente.cita}
              </a>
            ) : (
              <p className="mt-0.5 text-[11px] text-warning">Sin regla aplicable — requiere revisión posterior con especialista.</p>
            )}
            {c.checklist.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-[12px] text-ink">
                {c.checklist.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {datos.banderas_rojas.length > 0 && (
        <Callout tono="danger" variante="inline" titulo="Banderas">
          <ul className="list-inside list-disc text-[12px]">
            {datos.banderas_rojas.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Callout>
      )}
      <p className="border-t border-line-subtle pt-2 text-[11px] italic text-ink-muted" data-testid="disclaimer-grafo">
        {datos.disclaimer}
      </p>
    </div>
  )
}

export function TecnologiaView({ datos }: { datos: DatosTecnologia }) {
  const seccion = (titulo: string, items: Item[]) => (
    <div>
      <h3 className="mb-1 text-[12px] font-semibold text-ink">{titulo}</h3>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <ItemLinea key={i.texto} item={i} />
        ))}
      </ul>
    </div>
  )
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {seccion('Stack visible', datos.stackVisible)}
      {seccion('Herramientas probables', datos.herramientasProbables)}
      <div className="md:col-span-2">{seccion('Oportunidades de automatización', datos.oportunidadesAutomatizacion)}</div>
    </div>
  )
}

export function BriefView({ datos, icono: Icono }: { datos: DatosBrief; icono?: LucideIcon }) {
  const seccion = (titulo: string, items: Item[]) =>
    items.length > 0 && (
      <div>
        <h3 className="mb-1 text-[12px] font-semibold text-ink">{titulo}</h3>
        <ul className="space-y-1.5">
          {items.map((i) => (
            <ItemLinea key={i.texto} item={i} />
          ))}
        </ul>
      </div>
    )
  return (
    <div className="space-y-4" data-testid="brief-asesor">
      <Callout tono="accent" titulo="Resumen operativo (3 minutos antes de la llamada)" icono={Icono}>
        <p className="text-[13px]">{datos.resumen}</p>
      </Callout>
      <div className="grid gap-4 md:grid-cols-2">
        {seccion('Ángulos de conversación', datos.angulos)}
        {seccion('Hipótesis a validar', datos.hipotesis)}
        {seccion('Riesgos a explorar', datos.riesgos)}
        {seccion('Temas sensibles', datos.temasSensibles)}
      </div>
      <div>
        <h3 className="mb-1 text-[12px] font-semibold text-ink">Preguntas recomendadas para la entrevista</h3>
        <ol className="list-inside list-decimal space-y-1 text-[13px] text-ink">
          {datos.preguntasRecomendadas.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </div>
      <Callout tono="success" variante="inline" titulo="Siguiente paso recomendado">
        <p className="text-[13px]">{datos.siguientePaso}</p>
      </Callout>
    </div>
  )
}
