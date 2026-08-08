// Pipeline de agendamiento: orquesta store + notificaciones con el patrón
// fail-visible de la casa — intenta el camino real (seam) y si no está
// conectado cae al mock DECLARANDO el motivo en procedencia.fuente.
// 'ahora' es inyectable en todas las operaciones (determinismo en tests).

import { FUENTE_DATOS, NOTIFICADOR_AGENDA } from '@/shared/lib/config'
import { nuevoId } from '@/shared/lib/format'
import type { Cita, EnlaceReserva, NotificacionPendiente, ResultadoTransicion, Slot, SolicitudReserva } from './types'
import { REPROGRAMAR_HORAS_MIN } from './types'
import { esquemaSolicitudReserva } from './contratos'
import { crearCitaBase } from './mock'
import { construirNotificaciones } from './notificaciones'
import { ESTADOS_QUE_BLOQUEAN, calcularSlots } from './slots'
import { useAgendaStore } from './store'

type ResultadoReserva = { ok: true; cita: Cita } | { ok: false; motivo: string }

/** Citas que ocupan la agenda de un asesor (para slots y anti doble-reserva). */
export function citasQueBloquean(asesorId: string, excluirCitaId?: string): Array<{ inicio: string; fin: string }> {
  return useAgendaStore
    .getState()
    .citas.filter((c) => c.asesorId === asesorId && c.id !== excluirCitaId && ESTADOS_QUE_BLOQUEAN.includes(c.estado))
    .map((c) => ({ inicio: c.inicio, fin: c.fin }))
}

/** Slots de un asesor para una fecha (arma los insumos desde el store). */
export function slotsDeAsesor(params: {
  asesorId: string
  fecha: string
  ahora: string
  duracionMin?: number
  excluirCitaId?: string
}): Slot[] {
  const s = useAgendaStore.getState()
  const asesor = s.asesores.find((a) => a.id === params.asesorId)
  if (!asesor) return []
  const reglas = s.disponibilidad.find((d) => d.asesorId === asesor.id)?.reglas ?? []
  return calcularSlots({
    fecha: params.fecha,
    zonaHorariaAsesor: asesor.zonaHoraria,
    reglas,
    excepciones: s.excepciones.filter((e) => e.asesorId === asesor.id),
    citasOcupadas: citasQueBloquean(asesor.id, params.excluirCitaId),
    duracionMin: params.duracionMin ?? asesor.duracionDefaultMin,
    bufferMin: asesor.bufferMin,
    ahora: params.ahora,
  })
}

export function validarEnlace(token: string): EnlaceReserva | null {
  const enlace = useAgendaStore.getState().enlaces.find((e) => e.token === token)
  if (!enlace) return null
  if (enlace.usos >= enlace.usosMax) return null
  if (new Date(enlace.expiraAt).getTime() < Date.now()) return null
  return enlace
}

/** El cliente envía su solicitud. Camino real (POST /api/reservar) reservado al
 *  seam Supabase; el fallback mock escribe en el store con motivo declarado. */
export async function enviarSolicitudReserva(
  solicitud: SolicitudReserva,
  opts?: { ahora?: string }
): Promise<ResultadoReserva> {
  const ahora = opts?.ahora ?? new Date().toISOString()
  const parse = esquemaSolicitudReserva.safeParse(solicitud)
  if (!parse.success) {
    return { ok: false, motivo: parse.error.issues.map((i) => i.message).join(' ') }
  }

  const s = useAgendaStore.getState()
  const asesor = s.asesores.find((a) => a.id === solicitud.asesorId)
  if (!asesor) return { ok: false, motivo: 'Asesor no encontrado.' }
  const servicio = solicitud.servicioId ? s.servicios.find((x) => x.id === solicitud.servicioId) : null

  if (solicitud.token) {
    const enlace = validarEnlace(solicitud.token)
    if (!enlace) return { ok: false, motivo: 'El enlace de reserva no es válido, expiró o ya se usó.' }
  }

  // Anti doble-reserva del lado que el mock SÍ puede dar: el slot debe seguir libre.
  const duracionMin = servicio?.duracionMin ?? asesor.duracionDefaultMin
  const fecha = solicitud.inicio.slice(0, 10)
  const slots = slotsDeAsesor({ asesorId: asesor.id, fecha, ahora, duracionMin })
  const slot = slots.find((x) => x.inicio === solicitud.inicio)
  if (!slot || !slot.disponible) {
    return { ok: false, motivo: 'Ese horario ya no está disponible. Elige otro slot.' }
  }

  let fuenteMock = 'fixture demo agenda'
  try {
    if (FUENTE_DATOS !== 'real') throw new Error('NEXT_PUBLIC_COPILOT_DATA=mock: la reserva vive en el navegador')
    // Camino real (post-MVP): POST /api/reservar con el payload zod-validado.
    throw new Error('integración Supabase pendiente')
  } catch (e) {
    // Fallback VISIBLE: el mock declara por qué entró.
    const motivo = e instanceof Error ? e.message : String(e)
    fuenteMock = `fixture demo agenda — motivo: ${motivo}`
  }

  let cita = crearCitaBase(solicitud, nuevoId('cita'), ahora, { metodo: 'mock', fuente: fuenteMock })
  cita = {
    ...cita,
    fin: new Date(new Date(solicitud.inicio).getTime() + duracionMin * 60_000).toISOString(),
    pagoEstado: servicio?.requierePago ? 'pendiente' : 'no_requerido',
  }

  if (solicitud.token) useAgendaStore.getState().consumirEnlace(solicitud.token)
  useAgendaStore.getState().crearCita(cita)

  // Captura del lead en el embudo (RUNBOOK P6): fire-and-forget al escritor
  // server-side de `leads`. JAMÁS bloquea ni rompe la reserva; el fallo se
  // imprime (ningún best-effort silencioso). Solo en navegador: en tests/SSR
  // no hay servidor que reciba el POST.
  if (typeof window !== 'undefined') {
    void fetch('/api/reservar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parse.data),
    })
      .then((r) => {
        if (r.status === 503) console.info('[agenda] lead copilot no persistido: Supabase sin configurar (degradación declarada)')
        else if (!r.ok) console.warn('[agenda] lead copilot NO registrado: HTTP', r.status)
      })
      .catch((e) => console.warn('[agenda] lead copilot NO registrado:', e))
  }

  return { ok: true, cita }
}

export interface ResultadoAprobacion {
  resultado: ResultadoTransicion
  notificaciones: NotificacionPendiente[]
}

/** El asesor aprueba. Con NOTIFICADOR_AGENDA='mock' se simula el host-job:
 *  registra el par [email, whatsapp], los marca enviados y confirma la cita.
 *  `simularFalloCanal` (tests/demo) deja ese canal en error → la cita se queda
 *  en 'aprobada' con evento fallo_notificacion (el fallo JAMÁS es silencioso). */
export async function aprobarCita(
  citaId: string,
  opts?: { ahora?: string; simularFalloCanal?: 'email' | 'whatsapp' }
): Promise<ResultadoAprobacion> {
  const ahora = opts?.ahora ?? new Date().toISOString()
  const store = useAgendaStore.getState()
  const r = store.transicionar(citaId, 'aprobar', 'asesor', ahora)
  if (!r.ok) return { resultado: r, notificaciones: [] }

  const asesor = store.asesores.find((a) => a.id === r.cita.asesorId)
  if (!asesor) return { resultado: { ok: false, motivo: 'Asesor de la cita no encontrado.' }, notificaciones: [] }

  const pendientes = construirNotificaciones(r.cita, asesor, 'confirmacion_cita', ahora, {
    metodo: 'mock',
    fuente: `cola de notificaciones (notificador=${NOTIFICADOR_AGENDA})`,
  })
  store.registrarNotificaciones(pendientes)

  // Simulación del host-job (NOTIFICADOR_AGENDA='mock' es el único valor operable hoy).
  let todasEnviadas = true
  const procesadas = pendientes.map((n) => {
    if (opts?.simularFalloCanal === n.canal) {
      todasEnviadas = false
      useAgendaStore.getState().actualizarNotificacion(n.id, { estado: 'error', intentos: n.intentos + 1 })
      useAgendaStore
        .getState()
        .transicionar(citaId, 'fallo_notificacion', 'sistema_notificador', ahora, {
          detalle: `canal ${n.canal} falló (simulado); el cliente puede no haber recibido confirmación`,
        })
      return { ...n, estado: 'error' as const, intentos: n.intentos + 1 }
    }
    useAgendaStore.getState().actualizarNotificacion(n.id, { estado: 'enviada', intentos: n.intentos + 1, enviadaAt: ahora })
    return { ...n, estado: 'enviada' as const, intentos: n.intentos + 1, enviadaAt: ahora }
  })

  // confirmada = "el cliente fue notificado": solo si TODOS los canales salieron.
  const resultado = todasEnviadas
    ? useAgendaStore.getState().transicionar(citaId, 'confirmar', 'sistema_notificador', ahora)
    : ({ ok: true, cita: useAgendaStore.getState().citas.find((c) => c.id === citaId)! } as ResultadoTransicion)

  return { resultado, notificaciones: procesadas }
}

/** Reasignación: solicitada→solicitada con cambio de asesor (evento auditable). */
export async function reasignarCita(
  citaId: string,
  nuevoAsesorId: string,
  opts?: { ahora?: string }
): Promise<ResultadoTransicion> {
  const ahora = opts?.ahora ?? new Date().toISOString()
  const store = useAgendaStore.getState()
  const cita = store.citas.find((c) => c.id === citaId)
  if (!cita) return { ok: false, motivo: `Cita ${citaId} no encontrada.` }
  const nuevo = store.asesores.find((a) => a.id === nuevoAsesorId)
  if (!nuevo) return { ok: false, motivo: 'El asesor destino no existe.' }
  if (nuevo.id === cita.asesorId) return { ok: false, motivo: 'La cita ya está asignada a ese asesor.' }

  const r = store.transicionar(citaId, 'reasignar', 'asesor', ahora, {
    detalle: `reasignada de ${cita.asesorId} a ${nuevo.id}`,
    cambios: { asesorId: nuevo.id, reasignadaDeAsesorId: cita.asesorId },
  })
  if (!r.ok) return r

  const aviso = construirNotificaciones(r.cita, nuevo, 'reasignacion', ahora, {
    metodo: 'mock',
    fuente: `cola de notificaciones (notificador=${NOTIFICADOR_AGENDA})`,
  }).map((n) => ({ ...n, estado: 'enviada' as const, intentos: 1, enviadaAt: ahora }))
  useAgendaStore.getState().registrarNotificaciones(aviso)
  return r
}

export async function rechazarCita(citaId: string, opts?: { ahora?: string; detalle?: string }): Promise<ResultadoTransicion> {
  const ahora = opts?.ahora ?? new Date().toISOString()
  const store = useAgendaStore.getState()
  const r = store.transicionar(citaId, 'rechazar', 'asesor', ahora, { detalle: opts?.detalle })
  if (!r.ok) return r
  const asesor = store.asesores.find((a) => a.id === r.cita.asesorId)
  if (asesor) {
    const aviso = construirNotificaciones(r.cita, asesor, 'rechazo', ahora, {
      metodo: 'mock',
      fuente: `cola de notificaciones (notificador=${NOTIFICADOR_AGENDA})`,
    }).map((n) => ({ ...n, estado: 'enviada' as const, intentos: 1, enviadaAt: ahora }))
    useAgendaStore.getState().registrarNotificaciones(aviso)
  }
  return r
}

/** Reprogramación del cliente: confirmada→solicitada con nuevo horario y
 *  re-aprobación del asesor. Regla: solo con ≥REPROGRAMAR_HORAS_MIN de antelación
 *  sobre el horario ORIGINAL. */
export async function reprogramarCita(
  citaId: string,
  nuevoInicio: string,
  opts?: { ahora?: string }
): Promise<ResultadoTransicion> {
  const ahora = opts?.ahora ?? new Date().toISOString()
  const store = useAgendaStore.getState()
  const cita = store.citas.find((c) => c.id === citaId)
  if (!cita) return { ok: false, motivo: `Cita ${citaId} no encontrada.` }
  if (cita.estado !== 'confirmada') {
    return { ok: false, motivo: 'Solo una cita confirmada puede reprogramarse.' }
  }
  const margenMs = new Date(cita.inicio).getTime() - new Date(ahora).getTime()
  if (margenMs < REPROGRAMAR_HORAS_MIN * 3_600_000) {
    return { ok: false, motivo: `La reprogramación requiere al menos ${REPROGRAMAR_HORAS_MIN} h de antelación.` }
  }

  const duracionMs = new Date(cita.fin).getTime() - new Date(cita.inicio).getTime()
  const duracionMin = Math.round(duracionMs / 60_000)
  const slots = slotsDeAsesor({ asesorId: cita.asesorId, fecha: nuevoInicio.slice(0, 10), ahora, duracionMin, excluirCitaId: cita.id })
  const slot = slots.find((x) => x.inicio === nuevoInicio)
  if (!slot || !slot.disponible) return { ok: false, motivo: 'El nuevo horario no está disponible.' }

  return store.transicionar(citaId, 'reprogramar', 'cliente', ahora, {
    detalle: `reprogramada de ${cita.inicio} a ${nuevoInicio}`,
    cambios: { inicio: nuevoInicio, fin: new Date(new Date(nuevoInicio).getTime() + duracionMs).toISOString() },
  })
}
