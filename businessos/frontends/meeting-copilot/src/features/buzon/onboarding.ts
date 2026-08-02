// Máquina de estados del onboarding del buzón (SPEC-buzon-a2a §11.1). Mismo
// patrón que agenda/types.ts::TRANSICIONES_CITA/aplicarTransicion: tabla
// explícita de transiciones válidas, resultado {ok:true,...}|{ok:false,motivo},
// y esta función es la ÚNICA puerta de cambio de `estado` — nadie lo fija a mano.
//
// La regla que no se puede saltar (§11.1): `espejo` → `listo` exige ≥7 días
// naturales desde `espejoDesde` Y ≥20 borradores generados. No hay flag, ni
// override de soporte, ni atajo para demos — `puedeListo` es la ÚNICA puerta.

import type { Buzon, EstadoBuzon } from './types'
import type { Verificacion } from './verificacion'
import { configuracionCompleta } from './verificacion'

export type ActorBuzonOnboarding = 'cliente' | 'sistema_verificacion' | 'aprobador' | 'guardian'

export type EventoBuzonOnboarding =
  | 'elegir_plantilla'
  | 'verificaciones_completas'
  | 'solicitar_activacion'
  | 'firmar_activacion'
  | 'pausar'
  | 'reanudar'
  | 'desconectar'

export const TRANSICIONES_BUZON: Record<EstadoBuzon, EstadoBuzon[]> = {
  borrador: ['configurando'],
  configurando: ['espejo'],
  espejo: ['listo'],
  listo: ['activo'],
  activo: ['pausado', 'desconectado'],
  pausado: ['activo', 'desconectado'],
  desconectado: [],
}

/** Estado destino de cada evento — todos cambian estado (a diferencia de
 *  EventoCorreo, aquí no hay eventos de auditoría puros). */
export const ESTADO_POR_EVENTO_BUZON: Record<EventoBuzonOnboarding, EstadoBuzon> = {
  elegir_plantilla: 'configurando',
  verificaciones_completas: 'espejo',
  solicitar_activacion: 'listo',
  firmar_activacion: 'activo',
  pausar: 'pausado',
  reanudar: 'activo',
  desconectar: 'desconectado',
}

export function puedeTransicionarBuzon(de: EstadoBuzon, a: EstadoBuzon): boolean {
  return TRANSICIONES_BUZON[de].includes(a)
}

export const DIAS_MINIMOS_ESPEJO = 7
export const BORRADORES_MINIMOS_ESPEJO = 20

const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Único guard de `espejo` → `listo` (SPEC §11.1). Función pura: sin flag, sin
 *  override, sin atajo de demo — se llama SIEMPRE, incluso desde la UI que
 *  decide si mostrar el botón "Activar envío real" (§11.8). */
export function puedeListo(
  buzon: { espejoDesde: string | null },
  borradoresGenerados: number,
  ahora: string
): { ok: true } | { ok: false; motivo: string } {
  if (!buzon.espejoDesde) {
    return { ok: false, motivo: 'El buzón todavía no entró en modo espejo.' }
  }
  const dias = (new Date(ahora).getTime() - new Date(buzon.espejoDesde).getTime()) / MS_POR_DIA
  if (dias < DIAS_MINIMOS_ESPEJO) {
    const faltan = (DIAS_MINIMOS_ESPEJO - dias).toFixed(1)
    return { ok: false, motivo: `Faltan ${faltan} día(s) naturales en modo espejo (mínimo ${DIAS_MINIMOS_ESPEJO}).` }
  }
  if (borradoresGenerados < BORRADORES_MINIMOS_ESPEJO) {
    const faltan = BORRADORES_MINIMOS_ESPEJO - borradoresGenerados
    return { ok: false, motivo: `Faltan ${faltan} borrador(es) para el mínimo de ${BORRADORES_MINIMOS_ESPEJO}.` }
  }
  return { ok: true }
}

export type EstadoOnboardingBuzon = Pick<Buzon, 'estado' | 'espejoDesde' | 'activadoPor' | 'activadoEn'>

export type ResultadoTransicionBuzon =
  | { ok: true; estado: EstadoOnboardingBuzon }
  | { ok: false; motivo: string }

export interface ContextoTransicionBuzon {
  /** Requerido para `verificaciones_completas`. */
  verificaciones?: Verificacion[]
  /** Requerido para `solicitar_activacion` (evidencia de `puedeListo`). */
  borradoresGenerados?: number
  /** Requerido para `firmar_activacion`: nombre/rol de A5 (§11.1: "firma de A5"). */
  activadoPor?: string
}

/** Única puerta de cambio de `estado` del buzón. Valida la máquina + las
 *  reglas de negocio no-negociables de §11.1 y SIEMPRE deja al llamador
 *  registrar el evento en `buzon_bitacora` (esta función no escribe bitácora:
 *  esa responsabilidad es del store, igual que `transicionarSaliente`). */
export function aplicarTransicionBuzon(
  actual: EstadoOnboardingBuzon,
  evento: EventoBuzonOnboarding,
  actor: ActorBuzonOnboarding,
  at: string,
  contexto: ContextoTransicionBuzon = {}
): ResultadoTransicionBuzon {
  const destino = ESTADO_POR_EVENTO_BUZON[evento]

  if (!puedeTransicionarBuzon(actual.estado, destino)) {
    return { ok: false, motivo: `Transición inválida: ${actual.estado} → ${destino} (evento ${evento}).` }
  }

  if (evento === 'verificaciones_completas') {
    if (!contexto.verificaciones || !configuracionCompleta(contexto.verificaciones)) {
      return { ok: false, motivo: 'DNS, proveedor y política deben quedar en "verificado" los tres antes de entrar a modo espejo.' }
    }
    return { ok: true, estado: { ...actual, estado: destino, espejoDesde: at } }
  }

  if (evento === 'solicitar_activacion') {
    const r = puedeListo(actual, contexto.borradoresGenerados ?? 0, at)
    if (!r.ok) return { ok: false, motivo: r.motivo }
    return { ok: true, estado: { ...actual, estado: destino } }
  }

  if (evento === 'firmar_activacion') {
    if (actor !== 'aprobador') {
      return { ok: false, motivo: 'La activación exige la firma de A5 — no puede firmarla otro actor.' }
    }
    if (!contexto.activadoPor || contexto.activadoPor.trim().length === 0) {
      return { ok: false, motivo: 'Falta el nombre/rol de quien firma la activación.' }
    }
    return { ok: true, estado: { ...actual, estado: destino, activadoPor: contexto.activadoPor, activadoEn: at } }
  }

  if (evento === 'pausar' || evento === 'reanudar' || evento === 'desconectar') {
    if (actor !== 'guardian') {
      return { ok: false, motivo: `El evento "${evento}" solo lo dispara el Guardian, no "${actor}".` }
    }
    return { ok: true, estado: { ...actual, estado: destino } }
  }

  // elegir_plantilla: sin guard adicional — el store aplica plantilla/captarLeads aparte.
  return { ok: true, estado: { ...actual, estado: destino } }
}
