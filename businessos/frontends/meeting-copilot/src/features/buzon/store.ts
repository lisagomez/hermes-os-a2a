'use client'

// Store del buzón: demo ∪ usuario con copy-on-write (patrón agenda/store.ts).
// Los entrantes son catálogo estático en el mock (nadie los edita desde la UI,
// igual que `servicios` en agenda) — solo buzones (políticas), salientes
// (decisión de A5), verificaciones/relajamientos/falsos-positivos (§11) y
// bitácora (append-only) tienen slice de usuario.
//
// Las acciones del asistente de configuración (§11) viven en
// storeOnboarding.ts (slice del MISMO store, no un store aparte) para no
// pasar el límite de 500 líneas por archivo.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActorCorreo,
  Buzon as BuzonTipo,
  CanalAprobacion,
  CorreoSaliente,
  EventoBitacora as EventoBitacoraTipo,
  EventoCorreo,
  PlantillaBuzon,
  Proveedor,
  ResultadoTransicion,
} from './types'
import { aplicarTransicion, politicaValida } from './types'
import { ENTRANTES_DEMO, METRICAS_ESPEJO_DEMO } from './fixtures'
import type { VerificacionId } from './verificacion'
import type { Verificacion } from './verificacion'
import type { FalsoPositivoGate } from './gatesLenguaje'
import type { Relajamiento } from './relajamiento'
import type { SaludBuzon } from './salud'
import { derivar, nuevoIdBitacora, VACIO } from './storeShared'
import { crearOnboardingSlice } from './storeOnboarding'

// Reexportados para que storeOnboarding.ts (y otros slices futuros) tipen
// contra el store sin depender de types.ts directamente en dos sitios.
export type Buzon = BuzonTipo
export type EventoBitacora = EventoBitacoraTipo

export interface BuzonState {
  // Persistido (solo usuario)
  buzonesUsuario: Buzon[]
  salientesUsuario: CorreoSaliente[]
  bitacoraUsuario: EventoBitacora[]
  verificacionesUsuario: Record<string, Verificacion[]>
  relajamientosUsuario: Relajamiento[]
  falsosPositivosUsuario: FalsoPositivoGate[]

  // Derivado (demo ∪ usuario) — se recalcula en cada set/merge
  buzones: Buzon[]
  salientes: CorreoSaliente[]
  bitacora: EventoBitacora[]
  verificaciones: Record<string, Verificacion[]>
  relajamientos: Relajamiento[]
  falsosPositivos: FalsoPositivoGate[]
  /** Catálogo estático en MVP: lo ingiere ingerir-entrantes.py, la UI solo lee. */
  entrantes: typeof ENTRANTES_DEMO
  /** Señales del proveedor de correo (§11.11) — catálogo estático, como `entrantes`. */
  salud: SaludBuzon[]
  /** Contadores de modo espejo (§11.8) — catálogo estático + los que genera el mock al avanzar. */
  metricasEspejo: typeof METRICAS_ESPEJO_DEMO

  /** Única puerta de política: guard `politicaValida` (modo abierto exige firma
   *  completa). El agente jamás llama esto — es exclusivo de /buzon/politicas. */
  actualizarPoliticaBuzon: (
    buzonId: string,
    cambios: Partial<Buzon>,
    notaBitacora?: string
  ) => { ok: true } | { ok: false; motivo: string }
  /** Única puerta de cambio de estado de un saliente (mismo contrato que
   *  agenda::transicionar). */
  transicionarSaliente: (
    correoId: string,
    evento: EventoCorreo,
    actor: ActorCorreo,
    at: string,
    detalle?: string
  ) => ResultadoTransicion
  /** Atajo de la bandeja de A5: fija actor='aprobador' — la UI de aprobaciones
   *  nunca puede firmar como otro actor. */
  decidirAprobacion: (
    correoId: string,
    evento: 'aprobar' | 'rechazar' | 'reportar_inyeccion',
    detalle?: string
  ) => ResultadoTransicion

  // ── §11: asistente de configuración del cliente (implementadas en storeOnboarding.ts) ──

  /** Pantalla 0 (implícita): crea el buzón en `borrador`, plantilla aún sin elegir. */
  crearBuzonBorrador: (direccion: string, proveedor: Proveedor) => { ok: true; buzonId: string } | { ok: false; motivo: string }
  /** Pantalla 1 (§11.3): elige plantilla → aplica su modo/clases y dispara `configurando`.
   *  `politica_buzon` queda verificado de inmediato (es una verificación interna, sin
   *  dependencia externa). */
  elegirPlantilla: (
    buzonId: string,
    plantilla: PlantillaBuzon,
    captarLeads: boolean
  ) => { ok: true } | { ok: false; motivo: string }
  /** Un paso de "polling" sobre una verificación puntual (§11.2). Si al aplicarlo
   *  las 7 de configuración quedan verdes, dispara `verificaciones_completas`
   *  automáticamente — "el sistema se verifica solo" (§11.0). */
  avanzarVerificacion: (buzonId: string, id: VerificacionId, ahora: string) => void
  /** Ruta del administrador (§11.4): delega en un tercero. */
  delegarVerificacion: (buzonId: string, id: VerificacionId, admin: { nombre: string; correo: string }, ahora: string) => void
  /** El tercero ya autorizó (o el cliente adelanta el aviso). */
  resolverDelegacionVerificacion: (buzonId: string, id: VerificacionId, ahora: string) => void
  /** Demo-only: fuerza el camino `fallido` de la prueba de control positivo (§11.4). */
  simularFugaDeAlcance: (buzonId: string, ahora: string) => void
  /** Pantalla 5 (§11.7): aprobador+canal obligatorios → verifica `aprobador` de inmediato. */
  asignarAprobador: (
    buzonId: string,
    aprobador: string,
    canalAprobacion: CanalAprobacion,
    aprobadorSuplente: string | null,
    ahora: string
  ) => void
  /** §11.8: el botón "Activar envío real" — exige `puedeListo` (onboarding.ts). */
  solicitarActivacion: (buzonId: string, ahora: string) => { ok: true } | { ok: false; motivo: string }
  /** §11.1/§11.8: firma de A5 que activa el envío real. */
  firmarActivacion: (buzonId: string, activadoPor: string, ahora: string) => { ok: true } | { ok: false; motivo: string }
  /** §11.12: pausar/reanudar/desconectar — siempre los dispara el Guardian. */
  pausarBuzon: (buzonId: string, ahora: string) => { ok: true } | { ok: false; motivo: string }
  reanudarBuzon: (buzonId: string, ahora: string) => { ok: true } | { ok: false; motivo: string }
  desconectarBuzon: (buzonId: string, ahora: string) => { ok: true } | { ok: false; motivo: string }
  /** §11.9: decisión del cliente sobre una propuesta de relajamiento. */
  decidirRelajamiento: (
    id: string,
    decision: 'aplicar' | 'mantener' | 'recordar_despues',
    decididoPor: string,
    ahora: string
  ) => void
  /** §11.9: reversión automática (2 rechazos) — la dispara el host-job que lleva la racha; aquí es explícita para el demo. */
  revertirRelajamiento: (id: string, motivo: string, ahora: string) => void
  /** §11.10: "Esto es un falso positivo" — registra el caso con correo y gate. */
  reportarFalsoPositivo: (
    buzonId: string,
    gate: string,
    reportadoPor: string,
    ahora: string,
    opciones?: { hiloId?: string; correoId?: string; nota?: string }
  ) => void
}

export type Persistido = Pick<
  BuzonState,
  'buzonesUsuario' | 'salientesUsuario' | 'bitacoraUsuario' | 'verificacionesUsuario' | 'relajamientosUsuario' | 'falsosPositivosUsuario'
>

export const useBuzonStore = create<BuzonState>()(
  persist(
    (set, get) => ({
      ...VACIO,
      ...derivar(VACIO),

      actualizarPoliticaBuzon: (buzonId, cambios, notaBitacora) => {
        const base = get().buzones.find((b) => b.id === buzonId)
        if (!base) return { ok: false, motivo: `Buzón ${buzonId} no encontrado.` }
        const propuesto = { ...base, ...cambios }
        if (!politicaValida(propuesto)) {
          return { ok: false, motivo: 'El modo "abierto" exige firma de riesgo (quién y cuándo) antes de guardarse.' }
        }
        set((s) => {
          const buzonesUsuario = [...s.buzonesUsuario.filter((b) => b.id !== buzonId), propuesto]
          const bitacoraUsuario: EventoBitacora[] = [
            ...s.bitacoraUsuario,
            {
              id: nuevoIdBitacora(),
              ocurridoEn: new Date().toISOString(),
              actor: 'ui:politicas',
              evento: 'actualizado_politica',
              buzonId,
              hiloId: null,
              correoId: null,
              detalle: { modo: propuesto.modoContraparte, ...(notaBitacora ? { nota: notaBitacora } : {}) },
            },
          ]
          return { buzonesUsuario, bitacoraUsuario, ...derivar({ ...s, buzonesUsuario, bitacoraUsuario }) }
        })
        return { ok: true }
      },

      transicionarSaliente: (correoId, evento, actor, at, detalle) => {
        const actual = get().salientes.find((c) => c.id === correoId)
        if (!actual) return { ok: false, motivo: `Correo ${correoId} no encontrado.` }
        const r = aplicarTransicion(actual, evento, actor, at, detalle)
        if (!r.ok) return r
        set((s) => {
          const salientesUsuario = [...s.salientesUsuario.filter((c) => c.id !== correoId), r.correo]
          const bitacoraUsuario: EventoBitacora[] = [
            ...s.bitacoraUsuario,
            {
              id: nuevoIdBitacora(),
              ocurridoEn: at,
              actor: actor === 'aprobador' ? 'ui:aprobador' : actor,
              evento,
              buzonId: r.correo.buzonId,
              hiloId: r.correo.hiloId,
              correoId: r.correo.id,
              detalle: { de: actual.estado, a: r.correo.estado, ...(detalle ? { motivo: detalle } : {}) },
            },
          ]
          return { salientesUsuario, bitacoraUsuario, ...derivar({ ...s, salientesUsuario, bitacoraUsuario }) }
        })
        return r
      },

      decidirAprobacion: (correoId, evento, detalle) =>
        get().transicionarSaliente(correoId, evento, 'aprobador', new Date().toISOString(), detalle),

      ...crearOnboardingSlice(set, get),
    }),
    {
      name: 'meeting-copilot-buzon',
      partialize: (s): Persistido => ({
        buzonesUsuario: s.buzonesUsuario,
        salientesUsuario: s.salientesUsuario,
        bitacoraUsuario: s.bitacoraUsuario,
        verificacionesUsuario: s.verificacionesUsuario,
        relajamientosUsuario: s.relajamientosUsuario,
        falsosPositivosUsuario: s.falsosPositivosUsuario,
      }),
      merge: (persisted, actual) => {
        const p = { ...VACIO, ...((persisted ?? {}) as Partial<Persistido>) }
        return { ...actual, ...p, ...derivar(p) }
      },
    }
  )
)
