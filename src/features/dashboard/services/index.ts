import 'server-only'
import type { AiSpend, GrafoVista, Pantheon } from '../types'
import { mockAiSpend, mockGrafoVista, mockPantheon } from './mock'
import { realAiSpend, realGrafoVista, realPantheon } from './real'

/**
 * Conmutador de fuente de datos (server-only).
 *  - DASHBOARD_DATA=mock  -> fixtures (desarrollo en la máquina sin runtime)
 *  - DASHBOARD_DATA=real  -> Supabase + grafo + gateways
 *  - sin definir          -> real si hay SUPABASE_SERVICE_ROLE_KEY, mock si no
 */

export interface DataSource {
  aiSpend(): Promise<AiSpend>
  grafoVista(): Promise<GrafoVista>
  pantheon(): Promise<Pantheon>
}

const mockSource: DataSource = {
  aiSpend: async () => mockAiSpend,
  grafoVista: async () => mockGrafoVista,
  pantheon: async () => mockPantheon,
}

const realSource: DataSource = {
  aiSpend: realAiSpend,
  grafoVista: realGrafoVista,
  pantheon: realPantheon,
}

export function getDataSource(): DataSource {
  const modo = process.env.DASHBOARD_DATA
  if (modo === 'mock') return mockSource
  if (modo === 'real') return realSource
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? realSource : mockSource
}

export function dataSourceLabel(): 'mock' | 'real' {
  return getDataSource() === mockSource ? 'mock' : 'real'
}
