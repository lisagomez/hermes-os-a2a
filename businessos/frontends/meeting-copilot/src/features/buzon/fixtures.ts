// Fixtures demo del buzón — construidos LLAMANDO al provider mock (fidelidad
// garantizada entre fixture y fallback por construcción, patrón agenda/fixtures.ts).

import { mockBitacora, mockBuzones, mockSalientes, mockTodosLosEntrantes } from './mock'
import { mockMetricasEspejo, mockRelajamientos, mockSalud, mockVerificaciones } from './mockOnboarding'
import type { FalsoPositivoGate } from './gatesLenguaje'

export const BUZONES_DEMO = mockBuzones()
export const ENTRANTES_DEMO = mockTodosLosEntrantes()
export const SALIENTES_DEMO = mockSalientes()
export const BITACORA_DEMO = mockBitacora()
export const VERIFICACIONES_DEMO = mockVerificaciones()
export const SALUD_DEMO = mockSalud()
export const METRICAS_ESPEJO_DEMO = mockMetricasEspejo()
export const RELAJAMIENTOS_DEMO = mockRelajamientos()
export const FALSOS_POSITIVOS_DEMO: FalsoPositivoGate[] = []
