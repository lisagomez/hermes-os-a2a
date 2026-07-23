import 'server-only'
import type { AiSpend, DesarrolloVista, GrafoVista, Pantheon } from '../types'
import { DEPARTAMENTOS_REGISTRADOS } from '../types'
import { mockAiSpend, mockDesarrollo, mockGrafoVista, mockPantheon } from './mock'
import {
  realAiSpend,
  realDepartamentos,
  realDesarrollo,
  realGrafoVista,
  realPantheon,
} from './real'

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
  desarrollo(departamento?: string): Promise<DesarrolloVista>
  departamentos(): Promise<string[]>
}

const mockSource: DataSource = {
  aiSpend: async () => mockAiSpend,
  grafoVista: async () => mockGrafoVista,
  pantheon: async () => mockPantheon,
  // Las tareas fixture son todas del departamento software: filtrar por otro
  // devuelve lista vacía (mismo comportamiento honesto que la fuente real).
  desarrollo: async (departamento) =>
    departamento && departamento !== 'software' ? [] : mockDesarrollo,
  departamentos: async () => [...DEPARTAMENTOS_REGISTRADOS],
}

const realSource: DataSource = {
  aiSpend: realAiSpend,
  grafoVista: realGrafoVista,
  pantheon: realPantheon,
  desarrollo: realDesarrollo,
  departamentos: realDepartamentos,
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
