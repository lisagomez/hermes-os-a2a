'use client'

// Asistente de configuración, pantallas 2-5 (SPEC §11.4-§11.7). Tabs =
// PillToggle + query param (patrón de la casa). Las tres verificaciones
// avanzan EN PARALELO (§11.0 corolario): el cliente puede saltar entre
// pestañas libremente, ninguna bloquea a las demás — solo la entrada a modo
// espejo exige las tres en verde, y eso lo dispara el store SOLO, sin botón.

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Callout, PillToggle } from '@/shared/components/ui'
import type { Buzon } from './types'
import { VERIFICACIONES_CONFIGURACION, verificacionDe } from './verificacion'
import { useBuzonStore } from './store'
import { PantallaProveedor } from './PantallaProveedor'
import { PantallaDominio } from './PantallaDominio'
import { PantallaTono } from './PantallaTono'
import { PantallaAprobador } from './PantallaAprobador'

const PASOS = ['proveedor', 'dominio', 'tono', 'aprobador'] as const
type Paso = (typeof PASOS)[number]

const ETIQUETA_PASO: Record<Paso, string> = {
  proveedor: 'Conectar proveedor',
  dominio: 'Dominio de envío',
  tono: 'Semilla de tono',
  aprobador: 'Aprobador y canal',
}

export function AsistenteConfigurando({ buzon }: { buzon: Buzon }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const verificaciones = useBuzonStore((s) => s.verificaciones[buzon.id] ?? [])

  const paso = (searchParams.get('paso') as Paso | null) ?? 'proveedor'
  const irA = (p: Paso) => router.replace(`${pathname}?buzon=${buzon.id}&paso=${p}`, { scroll: false })

  const completas = VERIFICACIONES_CONFIGURACION.filter((id) => verificacionDe(verificaciones, id)?.estado === 'verificado').length

  return (
    <div data-testid="asistente-configurando">
      <Callout tono="info" variante="inline" className="mb-4">
        <p className="text-[12px]">
          DNS, proveedor y política avanzan en paralelo: {completas}/{VERIFICACIONES_CONFIGURACION.length} verificaciones en verde. En cuanto las 7 queden
          listas, el buzón entra solo a <span className="font-medium">modo espejo</span> — no hay botón que presionar.
        </p>
      </Callout>

      <PillToggle
        variante="suelto"
        opciones={PASOS.map((p) => ({ id: p, contenido: ETIQUETA_PASO[p], testid: `paso-${p}` }))}
        valor={paso}
        onCambio={irA}
        etiqueta="Pantalla del asistente"
        claseBoton="px-2.5 py-1 text-[12px]"
        className="mb-4"
      />

      {paso === 'proveedor' ? <PantallaProveedor buzon={buzon} onListo={() => irA('dominio')} /> : null}
      {paso === 'dominio' ? <PantallaDominio buzon={buzon} onListo={() => irA('tono')} /> : null}
      {paso === 'tono' ? <PantallaTono onListo={() => irA('aprobador')} /> : null}
      {paso === 'aprobador' ? <PantallaAprobador buzon={buzon} onListo={() => irA('proveedor')} /> : null}
    </div>
  )
}
