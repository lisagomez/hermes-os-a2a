// Captura de contactos en eventos presenciales (gafetes).
//
// Espejo del contrato de `public.evento_asistentes` (migración fase15, todavía
// sin aplicar) para que el salto a Supabase sea aditivo y no una reescritura.

/** De dónde salió la fila. Se guarda porque el aviso de privacidad obliga a
 *  documentar la base de licitud: no es lo mismo un dato que la persona nos dio
 *  al teclearlo que uno leído de su gafete. */
export type FuenteDato = 'gafete_escaneado' | 'captura_manual'

/** Cómo venía codificado el contenido del QR. En la Fase 2 todo entra como
 *  `crudo` (no hay intérprete todavía); los demás valores existen porque la
 *  columna de la tabla ya los admite y el tipo no debe cambiar al añadirlos. */
export type FormatoQr = 'vcard' | 'mecard' | 'url' | 'mailto' | 'tel' | 'json' | 'crudo'

/** Los campos que Victor confirmó que traen los gafetes del evento son los
 *  cuatro primeros. `puesto`, `telefono` y `notas` existen porque una tarjeta
 *  vCard los trae de regalo y descartarlos sería tirar información que ya
 *  tenemos en la mano. */
export interface DatosGafete {
  nombre: string
  empresa: string
  email: string
  sitio: string
  puesto: string
  telefono: string
  notas: string
}

export const DATOS_GAFETE_VACIOS: DatosGafete = {
  nombre: '',
  empresa: '',
  email: '',
  sitio: '',
  puesto: '',
  telefono: '',
  notas: '',
}

export interface AsistenteEvento {
  id: string
  reunionId: string
  /** sha256 del texto crudo normalizado. Es la clave antiduplicados, la misma
   *  que usa el índice único de la tabla. */
  huella: string
  /** Contenido EXACTO de lo que se escaneó o pegó. Nunca se borra ni se pisa,
   *  aunque los campos se corrijan: si mañana existe un intérprete mejor, se
   *  reprocesa sin haber perdido nada. */
  textoCrudo: string
  formato: FormatoQr
  datos: DatosGafete
  fuenteDato: FuenteDato
  /** true si una persona editó los campos después de la captura. */
  corregido: boolean
  /** Veces que se leyó ESTE mismo gafete. Un re-escaneo sube el contador; no
   *  crea una fila nueva. */
  escaneos: number
  /** Versión del aviso de privacidad vigente al capturar. Sin esto no se puede
   *  demostrar qué se le informó a la persona, que es justo lo que exige la
   *  base de licitud documentada (LFPDPPP Arts. 5 y 14). */
  avisoVersion: string
  capturadoAt: string
  /** false mientras la fila viva solo en este navegador. Se muestra en pantalla:
   *  un dato que solo existe en un teléfono es un dato en riesgo. */
  sincronizado: boolean
}

/** Un asistente sin nombre no sirve para nada: es el único campo que la ficha
 *  exige. El resto puede completarse después. */
export function estaIncompleto(datos: DatosGafete): boolean {
  return datos.nombre.trim().length === 0
}

/** Formas de contactar que quedaron capturadas. Se usa para avisar —no para
 *  bloquear— cuando alguien guarda un contacto al que no se le puede escribir. */
export function viasDeContacto(datos: DatosGafete): number {
  return [datos.email, datos.telefono, datos.sitio].filter((v) => v.trim().length > 0).length
}
