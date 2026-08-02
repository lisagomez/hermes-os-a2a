// Helpers compartidos entre store.ts (acciones núcleo) y storeOnboarding.ts
// (slice de §11) — separados para que ningún archivo pase de ~500 líneas.
// `Persistido` se importa como TYPE desde store.ts (Pick<BuzonState, ...>):
// así el shape persistido nunca se desalinea del store real.

import type { Persistido } from './store'
import {
  BITACORA_DEMO,
  BUZONES_DEMO,
  ENTRANTES_DEMO,
  FALSOS_POSITIVOS_DEMO,
  METRICAS_ESPEJO_DEMO,
  RELAJAMIENTOS_DEMO,
  SALIENTES_DEMO,
  SALUD_DEMO,
  VERIFICACIONES_DEMO,
} from './fixtures'

export function porId<T>(demo: T[], usuario: T[], id: (x: T) => string): T[] {
  const ids = new Set(usuario.map(id))
  return [...demo.filter((d) => !ids.has(id(d))), ...usuario]
}

export function derivar(p: Persistido) {
  return {
    buzones: porId(BUZONES_DEMO, p.buzonesUsuario, (b) => b.id),
    salientes: porId(SALIENTES_DEMO, p.salientesUsuario, (s) => s.id),
    bitacora: [...BITACORA_DEMO, ...p.bitacoraUsuario].sort((a, b) => a.ocurridoEn.localeCompare(b.ocurridoEn)),
    entrantes: ENTRANTES_DEMO,
    // Verificaciones: el usuario REEMPLAZA por completo la lista demo de un buzón
    // (nunca se mezclan entradas de las dos fuentes para el mismo buzonId).
    verificaciones: { ...VERIFICACIONES_DEMO, ...p.verificacionesUsuario },
    relajamientos: porId(RELAJAMIENTOS_DEMO, p.relajamientosUsuario, (r) => r.id),
    falsosPositivos: porId(FALSOS_POSITIVOS_DEMO, p.falsosPositivosUsuario, (f) => f.id),
    salud: SALUD_DEMO,
    metricasEspejo: METRICAS_ESPEJO_DEMO,
  }
}

export const VACIO: Persistido = {
  buzonesUsuario: [],
  salientesUsuario: [],
  bitacoraUsuario: [],
  verificacionesUsuario: {},
  relajamientosUsuario: [],
  falsosPositivosUsuario: [],
}

let contadorBitacora = 0
export function nuevoIdBitacora(): string {
  contadorBitacora += 1
  return `bitacora-usuario-${Date.now().toString(36)}-${contadorBitacora}`
}
