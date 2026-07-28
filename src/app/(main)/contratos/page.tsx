import { ContratoRevision } from '@/features/dashboard/components/contratos/contrato-revision'
import { getDataSource } from '@/features/dashboard/services'
import { Card } from '@/shared/components/card'
import { decidirContrato } from './actions'

export const dynamic = 'force-dynamic'

/**
 * /contratos — paquete de revisión de smart contracts (Fase 12 F5).
 * La fila la escribe el pipeline (Ejecutor → red efímera); aquí vive LA
 * decisión humana: aprobar habilita a desplegar-chaincode.py, rechazar
 * detiene todo (nada llega a la red). Banderas G1 arriba (G4).
 */
export default async function ContratosPage() {
  const contratos = await getDataSource().contratos()
  // Página force-dynamic: el "ahora" se fija una vez por request (métrica de
  // tiempo en revisión); no hay estado de cliente que pueda divergir.
  // eslint-disable-next-line react-hooks/purity -- timestamp por request intencional
  const ahora = Date.now()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contratos SC</h1>
        <p className="mt-1 text-sm text-slate-400">
          Fábrica de smart contracts (departamento contratos_inteligentes):
          últimos 20 desde <code className="text-slate-500">contratos_sc</code>.
          Aprobar aquí es el candado humano del despliegue; el host-job solo
          opera filas aprobadas y re-verifica el hash (G5).
        </p>
      </div>

      {contratos.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          Sin contratos fabricados todavía. Cuando el trío fabrique un paquete
          (departamento contratos_inteligentes), su fila aparecerá aquí con sus
          banderas G1 y el resultado de la red efímera.
        </Card>
      ) : (
        contratos.map((c) => (
          <ContratoRevision
            key={c.id}
            contrato={c}
            ahora={ahora}
            acciones={
              c.estado === 'en_revision' ? (
                <div className="flex flex-wrap items-end gap-2">
                  <form action={decidirContrato}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="decision" value="aprobado" />
                    <button
                      type="submit"
                      className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      ✓ Aprobar
                    </button>
                  </form>
                  <form action={decidirContrato} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="decision" value="rechazado" />
                    <input
                      name="motivo"
                      required
                      placeholder="motivo del rechazo"
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                    />
                    <button
                      type="submit"
                      className="rounded border border-rose-800 px-3 py-1 text-sm font-semibold text-rose-400 hover:bg-rose-950/40"
                    >
                      ✕ Rechazar
                    </button>
                  </form>
                </div>
              ) : null
            }
          />
        ))
      )}
    </div>
  )
}
