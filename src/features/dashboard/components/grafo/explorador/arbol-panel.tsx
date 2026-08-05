import { Card } from '@/shared/components/card'
import { MicroLabel } from '@/shared/components/section-title'
import { STATUS } from '@/shared/constants/colors'
import type {
  ArbolDimensionExplorador,
  ArbolExplorador,
  ImpactoExplorador,
  ReglaExplorador,
} from '../../../types'
import { NeutralBadge } from '../badges'

/**
 * Árbol jurisdicción→dimensión→reglas del explorador (App C paso 3).
 * Componentes puros sin hooks (los tests del gate los invocan como funciones).
 * Reglas de la vista: la vigencia nunca es color-solo, TODA regla muestra su
 * fuente citada, y los huecos (dimensión sin reglas, reglas descartadas por
 * schema) se declaran — el hueco es información, no se oculta.
 */

function ImpactoItem({ impacto }: { impacto: ImpactoExplorador }) {
  return (
    <li className="rounded-md border border-slate-800 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-300">{impacto.regimen}</span>
        <span className="text-slate-500">·</span>
        <span className="text-slate-400">
          {impacto.categoria ?? 'todas las categorías'}
        </span>
        {impacto.veredicto_base ? (
          <NeutralBadge texto={impacto.veredicto_base.replace(/_/g, ' ')} />
        ) : (
          <span className="italic text-slate-500">solo requisitos / banderas</span>
        )}
      </div>
      {impacto.requisitos.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-slate-400">
          {impacto.requisitos.map((r) => (
            <li key={r}>☐ {r}</li>
          ))}
        </ul>
      )}
      {impacto.banderas.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-amber-400">
          {impacto.banderas.map((b) => (
            <li key={b}>▲ {b}</li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function ReglaItem({ regla }: { regla: ReglaExplorador }) {
  return (
    <article className="border-l-2 border-slate-700 pl-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-xs text-slate-500">{regla.clave}</code>
        <span className="text-sm text-slate-100">{regla.titulo}</span>
        {regla.vigente ? (
          <NeutralBadge texto="vigente" tono="good" />
        ) : (
          <NeutralBadge texto="no vigente" tono="critical" />
        )}
      </div>
      {regla.texto_resumen && (
        <p className="mt-1 text-xs text-slate-400">{regla.texto_resumen}</p>
      )}
      <p className="mt-1 text-xs">
        {regla.fuente_url ? (
          <a
            href={regla.fuente_url}
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 underline decoration-dotted hover:text-sky-300"
          >
            {regla.fuente_cita}
          </a>
        ) : (
          <span className="text-slate-400">{regla.fuente_cita}</span>
        )}
        <span className="ml-2 text-slate-600">
          {regla.vigente_desde}
          {regla.vigente_hasta ? ` → ${regla.vigente_hasta}` : ' → sin derogación conocida'}
        </span>
      </p>
      {regla.impactos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {regla.impactos.map((i, idx) => (
            <ImpactoItem key={`${regla.clave}-${idx}`} impacto={i} />
          ))}
        </ul>
      )}
    </article>
  )
}

function DimensionBloque({ dimension }: { dimension: ArbolDimensionExplorador }) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <MicroLabel>{dimension.nombre}</MicroLabel>
        <span className="text-xs text-slate-500">
          {dimension.reglas.length} regla{dimension.reglas.length === 1 ? '' : 's'}
        </span>
      </div>
      {dimension.reglas.length === 0 ? (
        <p className="mt-1 text-xs" style={{ color: STATUS.warning }}>
          <span aria-hidden>▲</span> Sin reglas: hueco de cobertura (el grafo no
          sembró este ámbito todavía).
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {dimension.reglas.map((r) => (
            <ReglaItem key={r.clave} regla={r} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ArbolPanel({ arbol }: { arbol: ArbolExplorador }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {arbol.total_reglas} reglas en el conocimiento · vigencia evaluada al{' '}
        {arbol.fecha ?? 'día de hoy del grafo'}
      </p>
      {arbol.descartadas > 0 && (
        <p className="text-xs" style={{ color: STATUS.warning }}>
          <span aria-hidden>▲</span> {arbol.descartadas} regla
          {arbol.descartadas === 1 ? '' : 's'} descartada
          {arbol.descartadas === 1 ? '' : 's'} por forma irreconocible (posible
          desfase de versiones panel↔grafo). El resto del árbol es fiel.
        </p>
      )}
      {arbol.jurisdicciones.map((j, idx) => (
        <Card as="section" key={j.codigo}>
          <details open={idx === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-100">
              {j.nombre} <code className="ml-1 text-xs text-slate-500">{j.codigo}</code>
            </summary>
            {j.dimensiones.map((d) => (
              <DimensionBloque key={d.codigo} dimension={d} />
            ))}
          </details>
        </Card>
      ))}
    </div>
  )
}
