// Caso demo de Pre-Discovery (lead GAL): construido con el MISMO provider mock
// del pipeline — fidelidad garantizada entre fixture y fallback por construcción.

import type { CasoPreDiscovery, IntakeLead } from './types'
import { ORDEN_BLOQUES, estadoCasoDe } from './types'
import { mockBloque } from './mock'

export const INTAKE_GAL: IntakeLead = {
  telefono: '',
  email: '',
  web: 'https://galmexico.com/',
  tamano: '11-50',
  giro: 'Agencia de carga / logística (freight forwarder)',
  pais: 'México',
  notas:
    'LinkedIn empresa: https://www.linkedin.com/company/galogisticsmex/ · ' +
    'Fundadores: Adán Reyes García (https://www.linkedin.com/in/adan-reyesgracia/) y ' +
    'Rogelio Betancourt (https://www.linkedin.com/in/rogelio-betancourt-8a7891108/).',
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
