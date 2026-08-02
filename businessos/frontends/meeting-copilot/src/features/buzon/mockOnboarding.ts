// Provider mock DETERMINISTA de la experiencia de configuración (SPEC §11):
// verificaciones, salud, métricas de espejo y relajamiento. Separado de
// mock.ts (que ya cubre buzones/entrantes/salientes/bitácora) para no pasar
// el límite de 500 líneas por archivo — mismo doctrina determinista.

import { AHORA_FIJO } from './mock'
import type { Verificacion } from './verificacion'
import { TODAS_LAS_VERIFICACIONES } from './verificacion'
import type { MetricasEspejo } from './espejo'
import type { SaludBuzon } from './salud'
import type { Relajamiento } from './relajamiento'

/** Las 8 verificaciones del contrato §11.2, todas en `verificado` — el estado
 *  de un buzón que ya completó el asistente (asesoria/ventas/soporte). */
function verificacionesTodasVerdes(ahora: string): Verificacion[] {
  return TODAS_LAS_VERIFICACIONES.map((id) => ({
    id,
    estado: 'verificado' as const,
    mensaje: 'Verificado sin hallazgos.',
    ultimaRevision: ahora,
  }))
}

export function mockVerificaciones(): Record<string, Verificacion[]> {
  return {
    'buzon-asesoria': verificacionesTodasVerdes(AHORA_FIJO),
    'buzon-ventas': verificacionesTodasVerdes(AHORA_FIJO),
    'buzon-soporte': verificacionesTodasVerdes(AHORA_FIJO), // ya superó configurando: está en espejo
  }
}

/** Catálogo estático de señales del proveedor de correo (§11.11) — nadie las
 *  edita desde la UI en el MVP, igual que `entrantes`. */
export function mockSalud(): SaludBuzon[] {
  return [
    { buzonId: 'buzon-asesoria', entregabilidadPct: 99.6, rebotes: 0, dmarcOk: true, cuotaPct: 22 },
    { buzonId: 'buzon-ventas', entregabilidadPct: 98.9, rebotes: 1, dmarcOk: true, cuotaPct: 41 },
    { buzonId: 'buzon-soporte', entregabilidadPct: 99.2, rebotes: 0, dmarcOk: true, cuotaPct: 34 },
  ]
}

/** buzon-soporte en modo espejo: día 5 de 7, 38 borradores (SPEC §11.8, ejemplo literal). */
export function mockMetricasEspejo(): MetricasEspejo[] {
  return [
    {
      buzonId: 'buzon-soporte',
      borradoresGenerados: 38,
      sinCambios: 35,
      conEdicion: 3,
      rechazados: 0,
      verificacionesBloqueadas: [
        { motivo: '1 destinatario fuera de la conversación', cantidad: 1 },
        { motivo: '1 adjunto no catalogado', cantidad: 1 },
      ],
    },
  ]
}

/** buzon-ventas, clase "seguimiento": 27 aprobaciones consecutivas sin edición,
 *  34 días activo → cumple el gate de §11.9 y queda como propuesta pendiente. */
export function mockRelajamientos(): Relajamiento[] {
  return [
    {
      id: 'relajamiento-ventas-seguimiento',
      buzonId: 'buzon-ventas',
      clase: 'seguimiento',
      estado: 'propuesto',
      evidencia: { rachaAprobaciones: 27, diasActivo: 34 },
      propuestoEn: '2026-07-30T10:00:00.000Z',
      decididoPor: null,
      decididoEn: null,
      revertidoEn: null,
      revertidoMotivo: null,
    },
  ]
}
