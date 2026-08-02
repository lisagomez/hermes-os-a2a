'use client'

// /buzon/configurar — el asistente de configuración del cliente (SPEC §11).
// Un solo árbol de estado por buzón: `estado` decide qué pantalla se muestra,
// nunca una bandera aparte que pueda desalinearse (mismo principio que
// `estadoHilo` en hilos.ts: SIEMPRE derivado).

import { useState } from 'react'
import { Inbox, Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, Callout, Chip, EmptyState, PillToggle, SectionHeader } from '@/shared/components/ui'
import type { Buzon, Proveedor } from './types'
import { ETIQUETA_ESTADO_BUZON } from './types'
import { SchemaCorreoProveedor } from './validacion'
import { useBuzonStore } from './store'
import { PantallaTipoBuzon } from './PantallaTipoBuzon'
import { AsistenteConfigurando } from './AsistenteConfigurando'
import { PanelEspejo } from './PanelEspejo'
import { PantallaFirma } from './PantallaFirma'
import { PanelOperativo } from './PanelOperativo'
import { metricasDe } from './espejo'

const TONO_ESTADO_BUZON: Record<Buzon['estado'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  borrador: 'neutral',
  configurando: 'info',
  espejo: 'warning',
  listo: 'warning',
  activo: 'success',
  pausado: 'warning',
  desconectado: 'danger',
}

function FormularioNuevoBuzon({ onCreado }: { onCreado: (buzonId: string) => void }) {
  const crearBuzonBorrador = useBuzonStore((s) => s.crearBuzonBorrador)
  const [abierto, setAbierto] = useState(false)
  const [correo, setCorreo] = useState('')
  const [proveedor, setProveedor] = useState<Proveedor>('google')
  const [error, setError] = useState<string | null>(null)

  if (!abierto) {
    return (
      <Button tamano="sm" onClick={() => setAbierto(true)} data-testid="nuevo-buzon">
        <Plus className="mr-1 inline h-3.5 w-3.5" /> Nuevo buzón
      </Button>
    )
  }

  const confirmar = () => {
    const parsed = SchemaCorreoProveedor.safeParse({ correo })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Correo inválido.')
    const r = crearBuzonBorrador(parsed.data.correo, proveedor)
    if (!r.ok) return setError(r.motivo)
    setError(null)
    setAbierto(false)
    setCorreo('')
    onCreado(r.buzonId)
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="form-nuevo-buzon">
      <input
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="nuevobuzon@suempresa.com"
        className="input text-[12px]"
        data-testid="input-nuevo-buzon-correo"
      />
      <select value={proveedor} onChange={(e) => setProveedor(e.target.value as Proveedor)} className="input text-[12px]" data-testid="select-nuevo-buzon-proveedor">
        <option value="google">Google Workspace</option>
        <option value="m365">Microsoft 365</option>
        <option value="imap">IMAP</option>
      </select>
      <Button tamano="sm" variante="primary" onClick={confirmar} data-testid="confirmar-nuevo-buzon">Crear</Button>
      <Button tamano="sm" variante="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  )
}

function ContenidoPorEstado({ buzon }: { buzon: Buzon }) {
  const metricasEspejo = useBuzonStore((s) => s.metricasEspejo)
  const ahora = new Date().toISOString()

  switch (buzon.estado) {
    case 'borrador':
      return <PantallaTipoBuzon buzonId={buzon.id} onListo={() => {}} />
    case 'configurando':
      return <AsistenteConfigurando buzon={buzon} />
    case 'espejo':
      return <PanelEspejo buzon={buzon} ahora={ahora} />
    case 'listo':
      return <PantallaFirma buzon={buzon} metricas={metricasDe(metricasEspejo, buzon.id)} ahora={ahora} onCancelar={() => {}} />
    case 'activo':
    case 'pausado':
      return <PanelOperativo buzon={buzon} ahora={ahora} />
    case 'desconectado':
      return (
        <Callout tono="info" variante="inline">
          <p className="text-[12px]">Este buzón fue desconectado: las credenciales están revocadas. La bitácora completa sigue disponible.</p>
        </Callout>
      )
    default:
      return null
  }
}

export function ConfigurarBuzon() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const buzones = useBuzonStore((s) => s.buzones)

  const buzonId = searchParams.get('buzon') ?? buzones[0]?.id ?? ''
  const buzon = buzones.find((b) => b.id === buzonId) ?? null

  const seleccionar = (id: string) => router.replace(`${pathname}?buzon=${id}`, { scroll: false })

  return (
    <div data-testid="configurar-buzon">
      <SectionHeader
        titulo="Configurar buzón"
        descripcion="El sistema se verifica solo — cada paso termina en un estado comprobado por el backend, nunca en un guardar optimista."
        acciones={<FormularioNuevoBuzon onCreado={seleccionar} />}
      />

      {buzones.length === 0 ? (
        <EmptyState icono={Inbox} titulo="Sin buzones todavía" descripcion="Crea el primero para empezar el asistente de configuración." />
      ) : (
        <>
          <PillToggle
            variante="suelto"
            opciones={buzones.map((b) => ({
              id: b.id,
              contenido: (
                <span className="inline-flex items-center gap-1.5">
                  {b.direccion}
                  <Chip tono={TONO_ESTADO_BUZON[b.estado]}>{ETIQUETA_ESTADO_BUZON[b.estado]}</Chip>
                </span>
              ),
              testid: `seleccionar-buzon-${b.id}`,
            }))}
            valor={buzonId}
            onCambio={seleccionar}
            etiqueta="Elegir buzón a configurar"
            claseBoton="px-2.5 py-1 text-[12px]"
            className="mb-4"
          />

          {buzon ? <ContenidoPorEstado buzon={buzon} /> : null}
        </>
      )}
    </div>
  )
}
