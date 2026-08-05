import { EvaluacionCard } from '@/features/dashboard/components/grafo/evaluacion-card'
import { AmbitoSelector } from '@/features/dashboard/components/grafo/explorador/ambito-selector'
import { ArbolPanel } from '@/features/dashboard/components/grafo/explorador/arbol-panel'
import { ConstructorPanel } from '@/features/dashboard/components/grafo/explorador/constructor-panel'
import { NoDisponible } from '@/features/dashboard/components/grafo/explorador/no-disponible'
import { getDataSource } from '@/features/dashboard/services'
import { SectionTitle } from '@/shared/components/section-title'

export const dynamic = 'force-dynamic'

// La fecha se valida AQUÍ, antes de armar URLs hacia flujos-a2a: un valor
// malformado produciría un 422 del proxy que la capa de datos colapsaría al
// mismo null que una caída real — dos causas distintas, dos mensajes distintos.
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function ExploradorPage({
  searchParams,
}: {
  searchParams: Promise<{ jurisdiccion?: string; dimension?: string; fecha?: string }>
}) {
  const sp = await searchParams
  const fecha = sp.fecha && FECHA_RE.test(sp.fecha) ? sp.fecha : undefined
  const fechaInvalida = Boolean(sp.fecha) && !fecha
  const ambitoPedido = Boolean(sp.jurisdiccion && sp.dimension)
  const vista = await getDataSource().grafoExplorador({
    jurisdiccion: sp.jurisdiccion,
    dimension: sp.dimension,
    fecha,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Explorador regulatorio</h1>
        <p className="mt-1 text-sm text-slate-400">
          Árbol jurisdicción → dimensión → reglas y constructor de flujos de
          consulta, vía <code className="text-slate-500">flujos-a2a</code>{' '}
          (solo lectura por construcción). Señala riesgos con fuente citada; no
          asesora.
        </p>
        {fechaInvalida && (
          <p className="mt-1 text-xs text-amber-400">
            ▲ La fecha <code>{sp.fecha}</code> no tiene formato AAAA-MM-DD: se
            ignoró (vigencia evaluada a hoy).
          </p>
        )}
      </div>

      {!vista.disponible ? (
        <NoDisponible saludFlujos={vista.saludFlujos} />
      ) : (
        <>
          {vista.catalogos ? (
            <AmbitoSelector
              catalogos={vista.catalogos}
              jurisdiccion={sp.jurisdiccion}
              dimension={sp.dimension}
              fecha={fecha}
            />
          ) : (
            <p className="text-xs text-amber-400">
              ▲ Los catálogos no respondieron: selector de ámbito no disponible
              (el resto de la vista sigue).
            </p>
          )}

          <section>
            <SectionTitle className="mb-3">Constructor de flujos</SectionTitle>
            {vista.constructorAmbito ? (
              <ConstructorPanel insumos={vista.constructorAmbito} />
            ) : ambitoPedido ? (
              <p className="text-sm text-amber-400">
                ▲ flujos-a2a no resolvió el constructor para{' '}
                <code>{sp.jurisdiccion}</code> · <code>{sp.dimension}</code>{' '}
                (error del grafo o respuesta irreconocible). El árbol de abajo
                sigue siendo fiel.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Elige jurisdicción y dimensión arriba para derivar regímenes,
                categorías y la plantilla de <code>POST /evaluaciones</code>.
              </p>
            )}
          </section>

          <section>
            <SectionTitle className="mb-3">Árbol del conocimiento</SectionTitle>
            {vista.arbol ? (
              <ArbolPanel arbol={vista.arbol} />
            ) : (
              <p className="text-sm text-amber-400">
                ▲ El árbol no está disponible: <code>/arbol</code> no respondió o
                su forma no se reconoce (posible desfase de versiones
                panel↔flujos-a2a).
              </p>
            )}
          </section>

          <section>
            <SectionTitle className="mb-3">
              Evaluaciones recientes
              {vista.evaluaciones ? ` (${vista.evaluaciones.length})` : ''}
            </SectionTitle>
            {vista.evaluacionesDescartadas > 0 && (
              <p className="mb-2 text-xs text-amber-400">
                ▲ {vista.evaluacionesDescartadas} evaluación
                {vista.evaluacionesDescartadas === 1 ? '' : 'es'} descartada
                {vista.evaluacionesDescartadas === 1 ? '' : 's'} por forma
                irreconocible (posible desfase de versiones).
              </p>
            )}
            {vista.evaluaciones === null ? (
              <p className="text-sm text-amber-400">
                ▲ El historial de evaluaciones no respondió.
              </p>
            ) : vista.evaluaciones.length === 0 ? (
              <p className="text-sm text-slate-500">Sin evaluaciones persistidas todavía.</p>
            ) : (
              <div className="space-y-4">
                {vista.evaluaciones.map((e) => (
                  <EvaluacionCard key={e.id} evaluacion={e} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
