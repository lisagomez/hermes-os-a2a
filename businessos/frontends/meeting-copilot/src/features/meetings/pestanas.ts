// Qué pestañas ve una reunión, según de dónde salió.
//
// Por qué un módulo propio y no un condicional dentro de `MeetingHeader`: el
// gate de pruebas corre en entorno `node` y no monta componentes, así que una
// decisión enterrada en el JSX no se puede poner en rojo. Aquí es una función
// pura sobre un dato, y su prueba sí falla cuando alguien la rompe.
import type { OrigenReunion } from '@/features/domain/types'

export interface PestanaReunion {
  /** Último segmento de la ruta: /reuniones/:id/<seg> */
  seg: string
  etiqueta: string
}

/** Las cuatro vistas que nacen de una transcripción. */
const PESTANAS_CON_AUDIO: PestanaReunion[] = [
  { seg: 'transcripcion', etiqueta: 'Transcripción' },
  { seg: 'insights', etiqueta: 'Insights' },
  { seg: 'guiada', etiqueta: 'Guided Meeting' },
  { seg: 'resumen', etiqueta: 'Resumen' },
]

/** En un evento presencial lo que hay que hacer es capturar contactos, así que
 *  esa es la vista — y la única. */
const PESTANAS_PRESENCIAL: PestanaReunion[] = [{ seg: 'gafetes', etiqueta: 'Contactos' }]

/** Pestañas de una reunión.
 *
 *  Una reunión `presencial` no devuelve las cuatro de audio a propósito: nunca
 *  tendrá transcripción, así que `VistaReunion` mostraría para siempre el aviso
 *  de "procesa su audio" — un mensaje que en ese contexto es sencillamente
 *  falso. Mejor no ofrecer la puerta que ofrecer una que no lleva a ningún
 *  lado.
 *
 *  Lo que sí ofrece es la captura de contactos, que es lo que se hace de pie en
 *  un stand. */
export function pestanasDeReunion(origen: OrigenReunion): PestanaReunion[] {
  if (origen === 'presencial') return PESTANAS_PRESENCIAL
  return PESTANAS_CON_AUDIO
}
