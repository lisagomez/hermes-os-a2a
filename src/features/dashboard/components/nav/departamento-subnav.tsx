'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Submenú por departamento (segunda fila del navbar). Hoy solo adquisición
 * tiene secciones propias: sus Tareas (el trío) y el CRM conversacional con
 * el embudo de cliente. Un departamento sin submenú no pinta nada.
 *
 * La vista es pura (testeable sin navegador); el wrapper lee pathname y
 * query para decidir el departamento activo — estar en /crm cuenta como
 * adquisición aunque la URL no lleve ?departamento.
 */

const SUBMENUS: Record<string, { href: string; label: string; seccion: string }[]> = {
  adquisicion: [
    { href: '/desarrollo?departamento=adquisicion', label: 'Tareas', seccion: 'tareas' },
    { href: '/crm', label: 'CRM', seccion: 'crm' },
  ],
}

export function DepartamentoSubnavView({
  departamento,
  seccionActiva,
}: {
  departamento?: string
  seccionActiva?: string
}) {
  const entradas = departamento ? SUBMENUS[departamento] : undefined
  if (!entradas) return null
  return (
    <div className="border-b border-slate-800 bg-slate-900/40">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {departamento?.replace(/_/g, ' ')}
        </span>
        {entradas.map((e) => (
          <Link
            key={e.seccion}
            href={e.href}
            className={`rounded px-3 py-1 text-sm ${
              e.seccion === seccionActiva
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {e.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function SubnavConContexto() {
  const pathname = usePathname()
  const departamentoParam = useSearchParams().get('departamento') ?? undefined
  const enCrm = pathname.startsWith('/crm')
  const departamento = enCrm ? 'adquisicion' : departamentoParam
  const seccionActiva = enCrm ? 'crm' : 'tareas'
  return (
    <DepartamentoSubnavView departamento={departamento} seccionActiva={seccionActiva} />
  )
}

export function DepartamentoSubnav() {
  return (
    <Suspense fallback={null}>
      <SubnavConContexto />
    </Suspense>
  )
}
