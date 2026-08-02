// Catálogo de las 5 plantillas de buzón (SPEC-buzon-a2a §11.3). Pantalla 1 del
// asistente: primero el propósito, no la conexión. Cada tarjeta declara en
// lenguaje llano qué hará el agente, qué nunca hará y quién aprueba.

import type { ModoContraparte, PlantillaBuzon } from './types'

export interface DefinicionPlantilla {
  id: PlantillaBuzon
  nombre: string
  modoContraparte: ModoContraparte
  clases: string[]
  adjuntos: boolean
  /** null = sin tope aplicable (plantillas que no redactan). */
  topeIntercambios: number | null
  queHara: string
  queNuncaHara: string
  quienAprueba: string
  /** Interruptor "Crear un lead cuando escriba alguien nuevo" (§11.3). */
  captarLeadsDisponible: boolean
  captarLeadsDefault: boolean
}

export const PLANTILLAS_BUZON: DefinicionPlantilla[] = [
  {
    id: 'ventas',
    nombre: 'Ventas',
    modoContraparte: 'abierto_cuarentena',
    clases: ['acuse', 'info_catalogo', 'agendar'],
    adjuntos: false,
    topeIntercambios: 3,
    queHara: 'Acusa recibo, comparte información pública de catálogo y ofrece agendar una llamada.',
    queNuncaHara: 'No envía adjuntos ni negocia precio fuera de la política vigente del buzón.',
    quienAprueba: 'La persona que asignes como aprobador de este buzón (A5).',
    captarLeadsDisponible: true,
    captarLeadsDefault: true,
  },
  {
    id: 'reclutamiento',
    nombre: 'Reclutamiento',
    modoContraparte: 'abierto_cuarentena',
    clases: ['acuse', 'siguiente_paso', 'agendar'],
    adjuntos: false,
    topeIntercambios: 3,
    queHara: 'Acusa recibo de la postulación, explica el siguiente paso del proceso y ofrece agendar.',
    queNuncaHara: 'No comparte adjuntos ni comunica resultados de la evaluación por su cuenta.',
    quienAprueba: 'La persona que asignes como aprobador de este buzón (A5).',
    captarLeadsDisponible: true,
    captarLeadsDefault: true,
  },
  {
    id: 'soporte',
    nombre: 'Soporte',
    modoContraparte: 'abierto_cuarentena',
    clases: ['acuse', 'catalogo_publico', 'escalar'],
    adjuntos: false,
    topeIntercambios: 3,
    queHara: 'Acusa recibo, comparte el catálogo público de soluciones y escala cuando no puede resolver.',
    queNuncaHara: 'No comparte adjuntos ni promete tiempos de resolución no autorizados.',
    quienAprueba: 'La persona que asignes como aprobador de este buzón (A5).',
    captarLeadsDisponible: false,
    captarLeadsDefault: false,
  },
  {
    id: 'asesor_humano',
    nombre: 'Asesor humano',
    modoContraparte: 'cerrado',
    clases: [],
    adjuntos: false,
    topeIntercambios: null,
    queHara: 'Solo clasifica y prioriza el correo entrante para el asesor humano.',
    queNuncaHara: 'No redacta ni envía ninguna respuesta — el humano escribe siempre.',
    quienAprueba: 'n/a — no redacta correos que aprobar.',
    captarLeadsDisponible: false,
    captarLeadsDefault: false,
  },
  {
    id: 'legal_finanzas',
    nombre: 'Legal / Finanzas',
    modoContraparte: 'cerrado',
    clases: [],
    adjuntos: false,
    topeIntercambios: null,
    queHara: 'Solo clasifica y prioriza el correo entrante del área.',
    queNuncaHara: 'No redacta ni envía ninguna respuesta — el humano escribe siempre.',
    quienAprueba: 'n/a — no redacta correos que aprobar.',
    captarLeadsDisponible: false,
    captarLeadsDefault: false,
  },
]

export function plantillaPorId(id: PlantillaBuzon): DefinicionPlantilla {
  const def = PLANTILLAS_BUZON.find((p) => p.id === id)
  if (!def) throw new Error(`Plantilla desconocida: ${id}`)
  return def
}
