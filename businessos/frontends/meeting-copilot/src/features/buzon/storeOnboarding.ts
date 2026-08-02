// Slice de zustand para la experiencia de configuración del cliente (SPEC
// §11): crear buzón, avanzar el asistente, verificaciones/polling, activar,
// pausar/reanudar/desconectar, relajamiento y falsos positivos. Vive aparte
// de store.ts (que ya trae las acciones núcleo del buzón) para no pasar el
// límite de 500 líneas por archivo — es un SLICE del mismo store, no un store
// distinto: `crearOnboardingSlice` se spreadea dentro del único `create<BuzonState>()`.

import type { StoreApi } from 'zustand'
import { nuevoId } from '@/shared/lib/format'
import type { Buzon, BuzonState, EventoBitacora } from './store'
import type { ActorBuzonOnboarding, ContextoTransicionBuzon, EventoBuzonOnboarding } from './onboarding'
import { aplicarTransicionBuzon } from './onboarding'
import { plantillaPorId } from './plantillas'
import type { Verificacion } from './verificacion'
import {
  avanzarUnPaso,
  configuracionCompleta,
  delegarAAdministrador,
  resolverDelegacion,
  simularFugaDeAlcance as simularFugaDeAlcancePura,
  verificacionesIniciales,
} from './verificacion'
import type { FalsoPositivoGate } from './gatesLenguaje'
import type { Relajamiento } from './relajamiento'
import { metricasDe } from './espejo'
import { derivar, nuevoIdBitacora } from './storeShared'

type Set_ = StoreApi<BuzonState>['setState']
type Get_ = StoreApi<BuzonState>['getState']

export type OnboardingSlice = Pick<
  BuzonState,
  | 'crearBuzonBorrador'
  | 'elegirPlantilla'
  | 'avanzarVerificacion'
  | 'delegarVerificacion'
  | 'resolverDelegacionVerificacion'
  | 'simularFugaDeAlcance'
  | 'asignarAprobador'
  | 'solicitarActivacion'
  | 'firmarActivacion'
  | 'pausarBuzon'
  | 'reanudarBuzon'
  | 'desconectarBuzon'
  | 'decidirRelajamiento'
  | 'revertirRelajamiento'
  | 'reportarFalsoPositivo'
>

/** Aplica una lista de verificaciones actualizada y, si con eso queda completa
 *  la configuración, dispara `verificaciones_completas` de inmediato — "el
 *  sistema se verifica solo" (§11.0), sin botón de "continuar". */
function aplicarVerificacionesYRevisarGate(set: Set_, get: Get_, buzonId: string, actualizadas: Verificacion[], ahora: string): void {
  const buzon = get().buzones.find((b) => b.id === buzonId)
  const debeCompletar = buzon?.estado === 'configurando' && configuracionCompleta(actualizadas)
  set((s) => {
    const verificacionesUsuario = { ...s.verificacionesUsuario, [buzonId]: actualizadas }
    return { verificacionesUsuario, ...derivar({ ...s, verificacionesUsuario }) }
  })
  if (debeCompletar) {
    transicionarBuzon(set, get, buzonId, 'verificaciones_completas', 'sistema_verificacion', ahora, { verificaciones: actualizadas })
  }
}

/** Única puerta de cambio de `estado` de un Buzon: valida vía `aplicarTransicionBuzon`
 *  y, si aprueba, mergea el resultado + deja rastro en bitácora. */
function transicionarBuzon(
  set: Set_,
  get: Get_,
  buzonId: string,
  evento: EventoBuzonOnboarding,
  actor: ActorBuzonOnboarding,
  ahora: string,
  contexto: ContextoTransicionBuzon = {}
): { ok: true } | { ok: false; motivo: string } {
  const buzon = get().buzones.find((b) => b.id === buzonId)
  if (!buzon) return { ok: false, motivo: `Buzón ${buzonId} no encontrado.` }
  const r = aplicarTransicionBuzon(buzon, evento, actor, ahora, contexto)
  if (!r.ok) return { ok: false, motivo: r.motivo }
  // `activo` (legacy, solo cosmético en /buzon/politicas) se sincroniza en los
  // dos únicos eventos que cambian su sentido real: se enciende al firmar la
  // activación y se apaga al desconectar (revoca credenciales).
  const activo = evento === 'desconectar' ? false : evento === 'firmar_activacion' ? true : buzon.activo
  const propuesto: Buzon = { ...buzon, ...r.estado, activo }
  set((s) => {
    const buzonesUsuario = [...s.buzonesUsuario.filter((b) => b.id !== buzonId), propuesto]
    const bitacoraUsuario: EventoBitacora[] = [
      ...s.bitacoraUsuario,
      { id: nuevoIdBitacora(), ocurridoEn: ahora, actor, evento, buzonId, hiloId: null, correoId: null, detalle: { de: buzon.estado, a: propuesto.estado } },
    ]
    return { buzonesUsuario, bitacoraUsuario, ...derivar({ ...s, buzonesUsuario, bitacoraUsuario }) }
  })
  return { ok: true }
}

export function crearOnboardingSlice(set: Set_, get: Get_): OnboardingSlice {
  return {
    crearBuzonBorrador: (direccion, proveedor) => {
      const direccionLimpia = direccion.trim().toLowerCase()
      if (!direccionLimpia) return { ok: false, motivo: 'La dirección del buzón es obligatoria.' }
      if (get().buzones.some((b) => b.direccion.toLowerCase() === direccionLimpia)) {
        return { ok: false, motivo: `Ya existe un buzón para ${direccionLimpia}.` }
      }
      const id = nuevoId('buzon')
      const ahora = new Date().toISOString()
      const nuevo: Buzon = {
        id,
        direccion: direccionLimpia,
        proveedor,
        modoContraparte: 'cerrado',
        clasesPermitidas: [],
        cuotaHora: 10,
        cuotaHilo: 5,
        aprobadorRol: 'PM',
        activo: false,
        estado: 'borrador',
        plantilla: null,
        espejoDesde: null,
        activadoPor: null,
        activadoEn: null,
        aprobadorSuplente: null,
        canalAprobacion: 'panel',
        captarLeads: false,
      }
      set((s) => {
        const buzonesUsuario = [...s.buzonesUsuario, nuevo]
        const verificacionesUsuario = { ...s.verificacionesUsuario, [id]: verificacionesIniciales(ahora) }
        const bitacoraUsuario: EventoBitacora[] = [
          ...s.bitacoraUsuario,
          { id: nuevoIdBitacora(), ocurridoEn: ahora, actor: 'ui:configurar', evento: 'creado_buzon', buzonId: id, hiloId: null, correoId: null, detalle: { direccion: direccionLimpia, proveedor } },
        ]
        return { buzonesUsuario, verificacionesUsuario, bitacoraUsuario, ...derivar({ ...s, buzonesUsuario, verificacionesUsuario, bitacoraUsuario }) }
      })
      return { ok: true, buzonId: id }
    },

    elegirPlantilla: (buzonId, plantilla, captarLeads) => {
      const buzon = get().buzones.find((b) => b.id === buzonId)
      if (!buzon) return { ok: false, motivo: `Buzón ${buzonId} no encontrado.` }
      const def = plantillaPorId(plantilla)
      const ahora = new Date().toISOString()
      const r = aplicarTransicionBuzon(buzon, 'elegir_plantilla', 'cliente', ahora)
      if (!r.ok) return { ok: false, motivo: r.motivo }
      const propuesto: Buzon = {
        ...buzon,
        ...r.estado,
        plantilla,
        modoContraparte: def.modoContraparte,
        clasesPermitidas: def.clases,
        captarLeads: def.captarLeadsDisponible ? captarLeads : false,
      }
      set((s) => {
        const buzonesUsuario = [...s.buzonesUsuario.filter((b) => b.id !== buzonId), propuesto]
        const verificacionesActuales = s.verificaciones[buzonId] ?? verificacionesIniciales(ahora)
        const verificacionesConPolitica = verificacionesActuales.map((v) =>
          v.id === 'politica_buzon' ? { ...v, estado: 'verificado' as const, mensaje: 'Política del buzón guardada.', ultimaRevision: ahora } : v
        )
        const verificacionesUsuario = { ...s.verificacionesUsuario, [buzonId]: verificacionesConPolitica }
        const bitacoraUsuario: EventoBitacora[] = [
          ...s.bitacoraUsuario,
          { id: nuevoIdBitacora(), ocurridoEn: ahora, actor: 'ui:configurar', evento: 'elegir_plantilla', buzonId, hiloId: null, correoId: null, detalle: { plantilla, de: buzon.estado, a: propuesto.estado } },
        ]
        return { buzonesUsuario, verificacionesUsuario, bitacoraUsuario, ...derivar({ ...s, buzonesUsuario, verificacionesUsuario, bitacoraUsuario }) }
      })
      return { ok: true }
    },

    avanzarVerificacion: (buzonId, id, ahora) => {
      const actuales = get().verificaciones[buzonId]
      if (!actuales) return
      const actualizadas = actuales.map((v) => (v.id === id ? avanzarUnPaso(v, ahora) : v))
      aplicarVerificacionesYRevisarGate(set, get, buzonId, actualizadas, ahora)
    },

    delegarVerificacion: (buzonId, id, admin, ahora) => {
      const actuales = get().verificaciones[buzonId]
      if (!actuales) return
      const actualizadas = actuales.map((v) => (v.id === id ? delegarAAdministrador(v, admin, ahora) : v))
      set((s) => ({ verificacionesUsuario: { ...s.verificacionesUsuario, [buzonId]: actualizadas }, ...derivar({ ...s, verificacionesUsuario: { ...s.verificacionesUsuario, [buzonId]: actualizadas } }) }))
    },

    resolverDelegacionVerificacion: (buzonId, id, ahora) => {
      const actuales = get().verificaciones[buzonId]
      if (!actuales) return
      const actualizadas = actuales.map((v) => (v.id === id ? resolverDelegacion(v, ahora) : v))
      aplicarVerificacionesYRevisarGate(set, get, buzonId, actualizadas, ahora)
    },

    simularFugaDeAlcance: (buzonId, ahora) => {
      const actuales = get().verificaciones[buzonId]
      if (!actuales) return
      const actualizadas = actuales.map((v) => (v.id === 'lectura_buzon' ? simularFugaDeAlcancePura(v, ahora) : v))
      set((s) => ({ verificacionesUsuario: { ...s.verificacionesUsuario, [buzonId]: actualizadas }, ...derivar({ ...s, verificacionesUsuario: { ...s.verificacionesUsuario, [buzonId]: actualizadas } }) }))
    },

    asignarAprobador: (buzonId, aprobador, canalAprobacion, aprobadorSuplente, ahora) => {
      const buzon = get().buzones.find((b) => b.id === buzonId)
      if (!buzon) return
      const propuesto: Buzon = { ...buzon, aprobadorSuplente, canalAprobacion }
      const actuales = get().verificaciones[buzonId] ?? verificacionesIniciales(ahora)
      const actualizadas = actuales.map((v) =>
        v.id === 'aprobador' ? { ...v, estado: 'verificado' as const, mensaje: `${aprobador} aprueba por ${canalAprobacion}.`, ultimaRevision: ahora } : v
      )
      set((s) => {
        const buzonesUsuario = [...s.buzonesUsuario.filter((b) => b.id !== buzonId), propuesto]
        const verificacionesUsuario = { ...s.verificacionesUsuario, [buzonId]: actualizadas }
        const bitacoraUsuario: EventoBitacora[] = [
          ...s.bitacoraUsuario,
          { id: nuevoIdBitacora(), ocurridoEn: ahora, actor: 'ui:configurar', evento: 'asignar_aprobador', buzonId, hiloId: null, correoId: null, detalle: { aprobador, canalAprobacion, suplente: aprobadorSuplente ?? '(sin suplente)' } },
        ]
        return { buzonesUsuario, verificacionesUsuario, bitacoraUsuario, ...derivar({ ...s, buzonesUsuario, verificacionesUsuario, bitacoraUsuario }) }
      })
    },

    solicitarActivacion: (buzonId, ahora) =>
      transicionarBuzon(set, get, buzonId, 'solicitar_activacion', 'cliente', ahora, {
        borradoresGenerados: metricasDe(get().metricasEspejo, buzonId).borradoresGenerados,
      }),

    firmarActivacion: (buzonId, activadoPor, ahora) => transicionarBuzon(set, get, buzonId, 'firmar_activacion', 'aprobador', ahora, { activadoPor }),

    pausarBuzon: (buzonId, ahora) => transicionarBuzon(set, get, buzonId, 'pausar', 'guardian', ahora),
    reanudarBuzon: (buzonId, ahora) => transicionarBuzon(set, get, buzonId, 'reanudar', 'guardian', ahora),
    desconectarBuzon: (buzonId, ahora) => transicionarBuzon(set, get, buzonId, 'desconectar', 'guardian', ahora),

    decidirRelajamiento: (id, decision, decididoPor, ahora) => {
      const actual = get().relajamientos.find((r) => r.id === id)
      if (!actual) return
      if (decision === 'recordar_despues') {
        set((s) => {
          const bitacoraUsuario: EventoBitacora[] = [
            ...s.bitacoraUsuario,
            { id: nuevoIdBitacora(), ocurridoEn: ahora, actor: decididoPor, evento: 'relajamiento_recordar_despues', buzonId: actual.buzonId, hiloId: null, correoId: null, detalle: { clase: actual.clase } },
          ]
          return { bitacoraUsuario, ...derivar({ ...s, bitacoraUsuario }) }
        })
        return
      }
      const estado = decision === 'aplicar' ? ('aplicado' as const) : ('mantenido' as const)
      const propuesto: Relajamiento = { ...actual, estado, decididoPor, decididoEn: ahora }
      set((s) => {
        const relajamientosUsuario = [...s.relajamientosUsuario.filter((r) => r.id !== id), propuesto]
        const bitacoraUsuario: EventoBitacora[] = [
          ...s.bitacoraUsuario,
          {
            id: nuevoIdBitacora(),
            ocurridoEn: ahora,
            actor: decididoPor,
            evento: `relajamiento_${estado}`,
            buzonId: actual.buzonId,
            hiloId: null,
            correoId: null,
            detalle: { clase: actual.clase, racha: String(actual.evidencia.rachaAprobaciones), diasActivo: String(actual.evidencia.diasActivo) },
          },
        ]
        return { relajamientosUsuario, bitacoraUsuario, ...derivar({ ...s, relajamientosUsuario, bitacoraUsuario }) }
      })
    },

    revertirRelajamiento: (id, motivo, ahora) => {
      const actual = get().relajamientos.find((r) => r.id === id)
      if (!actual) return
      const propuesto: Relajamiento = { ...actual, estado: 'revertido', revertidoEn: ahora, revertidoMotivo: motivo }
      set((s) => {
        const relajamientosUsuario = [...s.relajamientosUsuario.filter((r) => r.id !== id), propuesto]
        const bitacoraUsuario: EventoBitacora[] = [
          ...s.bitacoraUsuario,
          { id: nuevoIdBitacora(), ocurridoEn: ahora, actor: 'sistema:relajamiento', evento: 'relajamiento_revertido', buzonId: actual.buzonId, hiloId: null, correoId: null, detalle: { clase: actual.clase, motivo } },
        ]
        return { relajamientosUsuario, bitacoraUsuario, ...derivar({ ...s, relajamientosUsuario, bitacoraUsuario }) }
      })
    },

    reportarFalsoPositivo: (buzonId, gate, reportadoPor, ahora, opciones) => {
      const nuevo: FalsoPositivoGate = {
        id: nuevoId('falso-positivo'),
        buzonId,
        hiloId: opciones?.hiloId ?? null,
        correoId: opciones?.correoId ?? null,
        gate,
        reportadoPor,
        reportadoEn: ahora,
        nota: opciones?.nota,
      }
      set((s) => {
        const falsosPositivosUsuario = [...s.falsosPositivosUsuario, nuevo]
        const bitacoraUsuario: EventoBitacora[] = [
          ...s.bitacoraUsuario,
          { id: nuevoIdBitacora(), ocurridoEn: ahora, actor: reportadoPor, evento: 'falso_positivo_reportado', buzonId, hiloId: nuevo.hiloId, correoId: nuevo.correoId, detalle: { gate, ...(nuevo.nota ? { nota: nuevo.nota } : {}) } },
        ]
        return { falsosPositivosUsuario, bitacoraUsuario, ...derivar({ ...s, falsosPositivosUsuario, bitacoraUsuario }) }
      })
    },
  }
}
