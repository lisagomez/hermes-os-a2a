'use client'

// M3 — Vista PÚBLICA del cliente (sin shell, mobile-first, patrón Calendly):
// wizard de un paso a la vez con el paso en la URL (?paso=). Solo se ofrecen
// slots realmente libres; la hora se muestra en la TZ del cliente, explícita.

import { useMemo, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarCheck2, SearchX } from 'lucide-react'
import { Button, Callout, Card, Chip, EmptyState } from '@/shared/components/ui'
import { fmtFecha, fmtPrecio } from '@/shared/lib/format'
import type { RespuestaDiscovery, SessionDepth } from './types'
import { ETIQUETA_DEPTH } from './types'
import { etiquetaTz, fmtHoraEnTz } from './slots'
import { enviarSolicitudReserva, validarEnlace } from './pipeline'
import { useAgendaStore, useAsesor } from './store'
import { SelectorFecha } from './SelectorFecha'
import { SelectorSlots } from './SelectorSlots'

type Paso = 'datos' | 'horario' | 'exito'

export function ReservaCliente() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const asesor = useAsesor(params.slug ?? null)
  const servicios = useAgendaStore((s) => s.servicios)
  const enlaces = useAgendaStore((s) => s.enlaces)

  const servicio = useMemo(() => {
    const slugServicio = searchParams.get('servicio')
    return slugServicio ? (servicios.find((x) => x.slug === slugServicio) ?? null) : null
  }, [searchParams, servicios])

  const depth: SessionDepth = servicio?.sessionDepth ?? (searchParams.get('depth') === 'discovery' ? 'discovery' : 'quick')
  const token = searchParams.get('t')
  const enlace = useMemo(() => (token ? validarEnlace(token) : null), [token, enlaces]) // eslint-disable-line react-hooks/exhaustive-deps

  const ahora = useMemo(() => new Date().toISOString(), [])
  const tzCliente = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const pasoUrl = searchParams.get('paso')
  const [nombre, setNombre] = useState(enlace?.clientePrecargado?.nombre ?? '')
  const [email, setEmail] = useState(enlace?.clientePrecargado?.email ?? '')
  const [telefono, setTelefono] = useState(enlace?.clientePrecargado?.telefono ?? '')
  // El brief viaja en la URL desde /servicios (ruta B discovery); aquí solo se lee.
  const brief = useMemo<RespuestaDiscovery[] | null>(() => {
    const crudo = searchParams.get('brief')
    if (!crudo) return null
    try {
      return JSON.parse(decodeURIComponent(crudo)) as RespuestaDiscovery[]
    } catch {
      return null
    }
  }, [searchParams])
  const [fecha, setFecha] = useState<string | null>(null)
  const [slotElegido, setSlotElegido] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<{ inicio: string } | null>(null)

  const datosCompletos = nombre.trim() !== '' && email.trim() !== '' && telefono.trim() !== ''
  // El paso vive en la URL, pero con guardas: sin datos no hay horario; el
  // éxito solo existe tras confirmar.
  const paso: Paso = exito ? 'exito' : pasoUrl === 'horario' && datosCompletos ? 'horario' : 'datos'

  const irA = (p: Paso) => {
    const q = new URLSearchParams(searchParams.toString())
    if (p === 'datos') q.delete('paso')
    else q.set('paso', p)
    router.replace(`${pathname}?${q.toString()}`, { scroll: false })
  }

  if (!asesor) {
    return (
      <Envoltura>
        <EmptyState
          icono={SearchX}
          titulo="Esta página de reserva no existe"
          descripcion="El enlace puede estar vencido o mal escrito. Pide al equipo un enlace de reserva actualizado."
        />
      </Envoltura>
    )
  }

  const duracionMin = servicio?.duracionMin ?? asesor.duracionDefaultMin

  const confirmar = async () => {
    if (!slotElegido) return
    setError(null)
    const r = await enviarSolicitudReserva(
      {
        slug: asesor.slug,
        asesorId: asesor.id,
        servicioId: servicio?.id ?? null,
        inicio: slotElegido,
        cliente: { nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim() },
        sessionDepth: depth,
        brief: depth === 'discovery' ? brief : null,
        token: enlace ? token : null,
      },
      { ahora }
    )
    if (!r.ok) {
      setError(r.motivo)
      setSlotElegido(null)
      return
    }
    setExito({ inicio: r.cita.inicio })
  }

  return (
    <Envoltura>
      <div data-testid="reserva-cliente">
        {/* Header del asesor */}
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[14px] font-semibold text-accent-ink">
            {asesor.avatarIniciales}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">{asesor.nombre}</p>
            <p className="text-[12px] text-ink-secondary">{asesor.especialidad}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <Chip tono={depth === 'discovery' ? 'accent' : 'neutral'}>{ETIQUETA_DEPTH[depth]}</Chip>
          <Chip>{duracionMin} min</Chip>
          {servicio ? <Chip>{servicio.nombre}</Chip> : null}
          {servicio?.requierePago ? <Chip tono="warning">{fmtPrecio(servicio.precioCentavos, servicio.moneda)} — pago previo</Chip> : null}
        </div>

        {!enlace ? (
          <Callout tono="info" variante="inline" className="mb-4" data-testid="banner-demo">
            <p className="text-[12px]">Vista de demostración pública — en esta demo la reserva vive en tu navegador (asesor y cliente comparten datos mock).</p>
          </Callout>
        ) : null}
        {token && !enlace ? (
          <Callout tono="warning" variante="inline" className="mb-4">
            <p className="text-[12px]">El enlace personalizado no es válido, expiró o ya se usó; puedes continuar llenando tus datos.</p>
          </Callout>
        ) : null}

        {paso === 'datos' ? (
          <Card className="space-y-3 p-4">
            <h2 className="text-[14px] font-semibold text-ink">Tus datos</h2>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className="input" maxLength={120} aria-label="Nombre" data-testid="reserva-nombre" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email" className="input" maxLength={160} aria-label="Correo" data-testid="reserva-email" />
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="WhatsApp (con lada)" className="input" maxLength={20} aria-label="Teléfono" data-testid="reserva-telefono" />
            {depth === 'discovery' && (!brief || brief.length === 0) ? (
              <Callout tono="warning" variante="inline">
                <p className="text-[12px]">Una sesión discovery necesita el mini-formulario de contexto — entra desde el catálogo de servicios para llenarlo.</p>
              </Callout>
            ) : null}
            <Button variante="primary" className="w-full" disabled={!datosCompletos || (depth === 'discovery' && (!brief || brief.length === 0))} onClick={() => irA('horario')} data-testid="reserva-continuar">
              Elegir horario
            </Button>
          </Card>
        ) : null}

        {paso === 'horario' ? (
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-ink">Elige fecha y hora</h2>
              <Button variante="ghost" tamano="sm" onClick={() => irA('datos')}>
                ← Datos
              </Button>
            </div>
            {error ? (
              <Callout tono="danger" variante="inline" data-testid="reserva-error">
                <p className="text-[12px]">{error}</p>
              </Callout>
            ) : null}
            <SelectorFecha
              asesorId={asesor.id}
              zonaHorariaAsesor={asesor.zonaHoraria}
              duracionMin={duracionMin}
              ahora={ahora}
              seleccionada={fecha}
              onSeleccion={(f) => {
                setFecha(f)
                setSlotElegido(null)
              }}
            />
            {fecha ? (
              <SelectorSlots
                asesorId={asesor.id}
                fecha={fecha}
                duracionMin={duracionMin}
                ahora={ahora}
                zonaHorariaCliente={tzCliente}
                onElegir={setSlotElegido}
              />
            ) : (
              <p className="text-[12px] text-ink-muted">Elige un día para ver los horarios libres.</p>
            )}
            {slotElegido ? (
              <div className="space-y-2 border-t border-line-subtle pt-3">
                <p className="text-[13px] text-ink">
                  {fmtFecha(slotElegido)} · <span className="font-semibold">{fmtHoraEnTz(slotElegido, tzCliente)}</span>{' '}
                  <span className="text-ink-secondary">({etiquetaTz(tzCliente, slotElegido)})</span>
                </p>
                <Button variante="primary" className="w-full" onClick={confirmar} data-testid="reserva-confirmar">
                  Confirmar solicitud
                </Button>
              </div>
            ) : null}
          </Card>
        ) : null}

        {paso === 'exito' && exito ? (
          <Card className="space-y-3 p-5 text-center" data-testid="reserva-exito">
            <CalendarCheck2 className="mx-auto h-8 w-8 text-success" />
            <h2 className="text-[15px] font-semibold text-ink">Solicitud enviada</h2>
            <p className="text-[13px] text-ink-secondary">
              {fmtFecha(exito.inicio)} · {fmtHoraEnTz(exito.inicio, tzCliente)} ({etiquetaTz(tzCliente, exito.inicio)})
            </p>
            <p className="text-[12px] text-ink-secondary">
              {asesor.nombre} confirmará tu cita; recibirás la confirmación por correo y WhatsApp.
              {servicio?.requierePago ? ' El servicio requiere pago previo: la aprobación queda pendiente hasta registrarse.' : ''}
            </p>
            <Chip tono="warning">Estado: solicitada (esperando aprobación)</Chip>
          </Card>
        ) : null}
      </div>
    </Envoltura>
  )
}

/** Layout público mobile-first: página limpia, sin shell interna. */
function Envoltura({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  )
}
