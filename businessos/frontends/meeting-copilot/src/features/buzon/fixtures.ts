// Fixtures demo del buzón — construidos LLAMANDO al provider mock (fidelidad
// garantizada entre fixture y fallback por construcción, patrón agenda/fixtures.ts).

import { mockBitacora, mockBuzones, mockSalientes, mockTodosLosEntrantes } from './mock'

export const BUZONES_DEMO = mockBuzones()
export const ENTRANTES_DEMO = mockTodosLosEntrantes()
export const SALIENTES_DEMO = mockSalientes()
export const BITACORA_DEMO = mockBitacora()
