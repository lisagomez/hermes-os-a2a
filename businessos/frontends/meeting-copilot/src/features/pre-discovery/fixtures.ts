// Caso demo de Pre-Discovery (lead GAL): construido con el MISMO provider mock
// del pipeline — fidelidad garantizada entre fixture y fallback por construcción.

import type { CasoPreDiscovery, IntakeLead } from './types'
import { ORDEN_BLOQUES, estadoCasoDe } from './types'
import { mockBloque } from './mock'

export const INTAKE_GAL: IntakeLead = {
  telefono: '+52 81 5555 0142',
  email: 'alex@galmexico.example',
  web: 'https://galmexico.example',
  tamano: '11-50',
  giro: 'Agencia de carga (freight forwarder)',
  pais: 'México',
  notas: 'Referido; interesa digitalizar cotización y seguimiento de embarques. Opera flete marítimo/aéreo y transporte terrestre.',
}

const BLOQUES_GAL = Object.fromEntries(ORDEN_BLOQUES.map((b) => [b, mockBloque(b, INTAKE_GAL)])) as CasoPreDiscovery['bloques']

export const CASO_DEMO_GAL: CasoPreDiscovery = {
  id: 'caso-gal',
  leadId: 'lead-gal',
  intake: INTAKE_GAL,
  estado: estadoCasoDe(BLOQUES_GAL),
  bloques: BLOQUES_GAL,
  activoId: 'act-loc-demo-1',
  creadoAt: '2026-07-26T12:00:00.000Z',
  actualizadoAt: '2026-07-26T12:00:00.000Z',
}

export const CASOS_DEMO: CasoPreDiscovery[] = [CASO_DEMO_GAL]
