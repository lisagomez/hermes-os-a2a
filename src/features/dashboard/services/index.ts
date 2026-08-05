import 'server-only'
import type {
  AiSpend,
  ContratosVista,
  CrmVista,
  DesarrolloVista,
  ExploradorParams,
  ExploradorVista,
  GrafoVista,
  Pantheon,
} from '../types'
import { DEPARTAMENTOS_REGISTRADOS } from '../types'
import {
  mockAiSpend,
  mockContratos,
  mockCrm,
  mockDesarrollo,
  mockGrafoExplorador,
  mockGrafoVista,
  mockPantheon,
} from './mock'
import {
  realAiSpend,
  realContratos,
  realCrm,
  realDecidirContratoSc,
  realDepartamentos,
  realMoverLeadEtapa,
  realDesarrollo,
  realGrafoExplorador,
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
  grafoExplorador(params: ExploradorParams): Promise<ExploradorVista>
  pantheon(): Promise<Pantheon>
  desarrollo(departamento?: string): Promise<DesarrolloVista>
  departamentos(): Promise<string[]>
  crm(): Promise<CrmVista>
  moverLeadEtapa(leadId: string, etapa: string): Promise<void>
  contratos(): Promise<ContratosVista>
  decidirContratoSc(
    id: string,
    decision: 'aprobado' | 'rechazado',
    quien: string,
    motivo?: string
  ): Promise<void>
}

const mockSource: DataSource = {
  aiSpend: async () => mockAiSpend,
  grafoVista: async () => mockGrafoVista,
  grafoExplorador: async (params) => mockGrafoExplorador(params),
  pantheon: async () => mockPantheon,
  // Las tareas fixture son todas del departamento software: filtrar por otro
  // devuelve lista vacía (mismo comportamiento honesto que la fuente real).
  desarrollo: async (departamento) =>
    departamento && departamento !== 'software' ? [] : mockDesarrollo,
  departamentos: async () => [...DEPARTAMENTOS_REGISTRADOS],
  crm: async () => mockCrm,
  // En mock no hay dónde persistir: la acción es un no-op explícito.
  moverLeadEtapa: async () => {},
  contratos: async () => mockContratos,
  decidirContratoSc: async () => {},
}

const realSource: DataSource = {
  aiSpend: realAiSpend,
  grafoVista: realGrafoVista,
  grafoExplorador: realGrafoExplorador,
  pantheon: realPantheon,
  desarrollo: realDesarrollo,
  departamentos: realDepartamentos,
  crm: realCrm,
  moverLeadEtapa: realMoverLeadEtapa,
  contratos: realContratos,
  decidirContratoSc: realDecidirContratoSc,
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
