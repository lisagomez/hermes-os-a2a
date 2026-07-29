// Fixtures demo de agendamiento — construidos LLAMANDO al provider mock
// (fidelidad garantizada entre fixture y fallback por construcción).

import { mockAsesores, mockCitas, mockDisponibilidad, mockEnlaces, mockExcepciones, mockNotificaciones, mockServicios } from './mock'

export const ASESORES_DEMO = mockAsesores()
export const DISPONIBILIDAD_DEMO = ASESORES_DEMO.map((a) => mockDisponibilidad(a.id))
export const EXCEPCIONES_DEMO = mockExcepciones()
export const SERVICIOS_DEMO = mockServicios()
export const CITAS_DEMO = mockCitas()
export const NOTIFICACIONES_DEMO = mockNotificaciones()
export const ENLACES_DEMO = mockEnlaces()
