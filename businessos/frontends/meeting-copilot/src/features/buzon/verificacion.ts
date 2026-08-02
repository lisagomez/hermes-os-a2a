// Contrato de verificación del asistente de configuración (SPEC-buzon-a2a
// §11.2). Toda verificación —DNS, permisos del proveedor, política, canal de
// aprobación— devuelve esta MISMA forma; un solo componente (VerificacionItem)
// la renderiza todas. Doctrina: "el sistema se verifica solo" (§11.0) — el
// cliente nunca adivina si un paso quedó bien.

export type VerificacionId =
  | 'dns_spf'
  | 'dns_dkim'
  | 'dns_dmarc'
  | 'oauth_consent'
  | 'access_policy'
  | 'lectura_buzon'
  | 'politica_buzon'
  | 'aprobador'

export type EstadoVerificacion = 'pendiente' | 'en_curso' | 'verificado' | 'esperando_tercero' | 'fallido'

export type TipoAccionVerificacion = 'copiar' | 'abrir_url' | 'reintentar' | 'delegar' | 'omitir'

export interface AccionVerificacion {
  etiqueta: string
  tipo: TipoAccionVerificacion
  payload: string
}

export interface Verificacion {
  id: VerificacionId
  estado: EstadoVerificacion
  /** En español, orientado a acción — nunca el id del gate/verificación. */
  mensaje: string
  /** Colapsado por defecto (§11.2): existe para cuando el cliente reenvía la pantalla a TI. */
  detalleTecnico?: string
  accion?: AccionVerificacion
  ultimaRevision: string // ISO
  /** Segundos hasta el próximo poll automático; el poll SIEMPRE es automático. */
  reintentoEn?: number
}

/** Agrupación de las verificaciones por pantalla del asistente (§11.1 corolario:
 *  dns/proveedor/política avanzan EN PARALELO). `aprobador` no bloquea la
 *  entrada a modo espejo — se resuelve de forma instantánea al elegir persona+canal
 *  en la pantalla 5, no por polling. */
export const VERIFICACIONES_DNS: VerificacionId[] = ['dns_spf', 'dns_dkim', 'dns_dmarc']
export const VERIFICACIONES_PROVEEDOR: VerificacionId[] = ['oauth_consent', 'access_policy', 'lectura_buzon']
export const VERIFICACIONES_POLITICA: VerificacionId[] = ['politica_buzon']

/** Las 7 que deben quedar en `verificado` para que `configurando` → `espejo`
 *  (SPEC §11.1: "las tres [grupos] en verificado"). */
export const VERIFICACIONES_CONFIGURACION: VerificacionId[] = [
  ...VERIFICACIONES_DNS,
  ...VERIFICACIONES_PROVEEDOR,
  ...VERIFICACIONES_POLITICA,
]

export const TODAS_LAS_VERIFICACIONES: VerificacionId[] = [...VERIFICACIONES_CONFIGURACION, 'aprobador']

export function verificacionDe(verificaciones: Verificacion[], id: VerificacionId): Verificacion | undefined {
  return verificaciones.find((v) => v.id === id)
}

function grupoVerificado(verificaciones: Verificacion[], ids: VerificacionId[]): boolean {
  return ids.every((id) => verificacionDe(verificaciones, id)?.estado === 'verificado')
}

/** Gate real de la transición `configurando` → `espejo` (SPEC §11.1). */
export function configuracionCompleta(verificaciones: Verificacion[]): boolean {
  return grupoVerificado(verificaciones, VERIFICACIONES_CONFIGURACION)
}

/** Invariante del contrato (§11.2): "`fallido` siempre trae `accion`. Un error
 *  sin siguiente paso es un callejón." Úsalo para validar cualquier lista antes
 *  de confiar en que se puede renderizar. */
export function verificacionValida(v: Verificacion): boolean {
  return v.estado !== 'fallido' || v.accion !== undefined
}

export function todasValidas(verificaciones: Verificacion[]): boolean {
  return verificaciones.every(verificacionValida)
}

/** `en_curso` y `esperando_tercero` hacen polling solos (§11.2): el cliente
 *  nunca presiona "verificar de nuevo" salvo que quiera adelantarlo. */
export function requierePolling(estado: EstadoVerificacion): boolean {
  return estado === 'en_curso' || estado === 'esperando_tercero'
}

const MENSAJE_PENDIENTE: Record<VerificacionId, string> = {
  dns_spf: 'Agrega el registro SPF para empezar la verificación.',
  dns_dkim: 'Agrega el registro DKIM para empezar la verificación.',
  dns_dmarc: 'Agrega el registro DMARC para empezar la verificación.',
  oauth_consent: 'Falta el consentimiento del administrador del proveedor.',
  access_policy: 'Falta aplicar la política de acceso restringido al grupo autorizado.',
  lectura_buzon: 'Se probará en cuanto el consentimiento y la política queden listos.',
  politica_buzon: 'Define el modo de contraparte y las clases permitidas del buzón.',
  aprobador: 'Elige quién aprueba los correos de este buzón.',
}

/** Semilla de un buzón que entra a `configurando`: las 8 verificaciones en
 *  `pendiente`, cada una con su mensaje de qué falta. */
export function verificacionesIniciales(ahora: string): Verificacion[] {
  return TODAS_LAS_VERIFICACIONES.map((id) => ({ id, estado: 'pendiente', mensaje: MENSAJE_PENDIENTE[id], ultimaRevision: ahora }))
}

const MENSAJE_OK: Record<VerificacionId, string> = {
  dns_spf: 'SPF verificado.',
  dns_dkim: 'DKIM verificado.',
  dns_dmarc: 'DMARC verificado (p=reject).',
  oauth_consent: 'El administrador autorizó el consentimiento.',
  access_policy: 'La política de acceso restringe correctamente al grupo autorizado.',
  lectura_buzon: 'Puedo leer el buzón autorizado y NO puedo leer ninguno fuera del grupo.',
  politica_buzon: 'Política del buzón guardada.',
  aprobador: 'Aprobador y canal de aprobación asignados.',
}

/** Un paso de "polling" (§11.2: en_curso/esperando_tercero avanzan solos).
 *  `pendiente` → `en_curso` → `verificado`; el resto de estados no cambian con
 *  esta función (ver `delegarAAdministrador`/`resolverDelegacion` para la
 *  ruta del administrador, y `simularFugaDeAlcance` para el camino `fallido`). */
export function avanzarUnPaso(v: Verificacion, ahora: string): Verificacion {
  if (v.estado === 'pendiente') {
    return { ...v, estado: 'en_curso', mensaje: 'Verificando…', ultimaRevision: ahora, reintentoEn: 30 }
  }
  if (v.estado === 'en_curso') {
    return { ...v, estado: 'verificado', mensaje: MENSAJE_OK[v.id], ultimaRevision: ahora, reintentoEn: undefined }
  }
  return v
}

/** Ruta del administrador (§11.4): el usuario en sesión no tiene permiso, así
 *  que se delega. Queda visible con nombre y correo del admin — nadie tiene
 *  que preguntar "¿en qué quedó?". */
export function delegarAAdministrador(v: Verificacion, admin: { nombre: string; correo: string }, ahora: string): Verificacion {
  return {
    ...v,
    estado: 'esperando_tercero',
    mensaje: `Esperando autorización de ${admin.nombre} (${admin.correo}). Recordatorio automático a las 48 h.`,
    accion: { etiqueta: 'Reenviar instrucciones', tipo: 'delegar', payload: admin.correo },
    ultimaRevision: ahora,
  }
}

/** El administrador ya autorizó (en producción esto lo dispara un webhook; en
 *  el mock es la acción "Ya lo autorizó" que el cliente puede usar para
 *  adelantar el aviso). */
export function resolverDelegacion(v: Verificacion, ahora: string): Verificacion {
  return { ...v, estado: 'verificado', mensaje: MENSAJE_OK[v.id], ultimaRevision: ahora, accion: undefined }
}

/** Prueba de control positivo que SÍ debería fallar (§11.4): "si la segunda
 *  prueba pasa cuando debería fallar, el paso queda en fallido con el comando
 *  de corrección". Demo-only: simula ese hallazgo para poder mostrar la UX. */
export function simularFugaDeAlcance(v: Verificacion, ahora: string): Verificacion {
  return {
    ...v,
    estado: 'fallido',
    mensaje: 'La prueba de control positivo falló: el agente SÍ pudo leer un buzón fuera del grupo autorizado.',
    detalleTecnico: 'ApplicationAccessPolicy no restringe Mail.Read al grupo del buzón (PolicyScopeGroupId).',
    accion: {
      etiqueta: 'Copiar comando de corrección',
      tipo: 'copiar',
      payload:
        'New-ApplicationAccessPolicy -AppId <id> -PolicyScopeGroupId <grupo-autorizado> -AccessRight RestrictAccess -Description "Restringe el buzón A2A"',
    },
    ultimaRevision: ahora,
  }
}

export const ETIQUETA_VERIFICACION: Record<VerificacionId, string> = {
  dns_spf: 'SPF',
  dns_dkim: 'DKIM',
  dns_dmarc: 'DMARC',
  oauth_consent: 'Consentimiento del proveedor',
  access_policy: 'Restricción de alcance',
  lectura_buzon: 'Prueba de control positivo',
  politica_buzon: 'Política del buzón',
  aprobador: 'Aprobador asignado',
}
