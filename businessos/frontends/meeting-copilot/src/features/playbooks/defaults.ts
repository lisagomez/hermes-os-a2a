import type { DimensionId, Playbook, TipoReunion } from '@/features/domain/types'

// Banco de preguntas por dimensión, ordenadas por prioridad. La next-best-question
// toma la primera pregunta del primer hueco en el ORDEN de prioridad del playbook.
export const ORDEN_PRIORIDAD: DimensionId[] = [
  'problema',
  'impacto',
  'urgencia',
  'proceso_decision',
  'stakeholders',
  'presupuesto',
  'competencia',
  'proximos_pasos',
]

const BANCO_BASE: Record<DimensionId, string[]> = {
  problema: [
    '¿Qué es lo que más se les complica hoy en la operación y por qué pasa?',
    '¿Desde cuándo tienen este problema y qué lo dispara?',
  ],
  impacto: [
    '¿Cuánto les cuesta este problema al mes, en dinero u horas?',
    'Si nada cambia en seis meses, ¿qué consecuencia tendría para el equipo?',
  ],
  urgencia: [
    '¿Para cuándo necesitan tener esto resuelto y qué pasa si se pasa esa fecha?',
    '¿Hay algún evento (temporada, auditoría, cierre) que marque el plazo?',
  ],
  proceso_decision: [
    '¿Cómo se decide una compra así en su empresa: quién autoriza y qué pasos siguen?',
    '¿Qué necesitarían ver para avanzar a una decisión?',
  ],
  stakeholders: [
    '¿Quién más participaría en la decisión o usaría la herramienta a diario?',
    '¿A quién le duele más este problema dentro de la empresa?',
  ],
  presupuesto: [
    '¿Tienen una partida o rango de inversión contemplado para resolver esto?',
    '¿Cómo se aprueba el presupuesto para una herramienta como esta?',
  ],
  competencia: [
    '¿Con qué herramientas resuelven esto hoy y qué les falta?',
    '¿Están evaluando otras opciones? ¿Qué les ha gustado o no de ellas?',
  ],
  proximos_pasos: [
    '¿Qué siguiente paso concreto acordamos, con quién y para qué fecha?',
    '¿Quién de su lado dará seguimiento a esto?',
  ],
}

function playbook(id: string, tipoReunion: TipoReunion, nombre: string, pesos: [DimensionId, number, boolean][]): Playbook {
  return {
    id,
    tipoReunion,
    nombre,
    dimensiones: pesos.map(([dimension, peso, critica]) => ({ dimension, peso, critica })),
    bancoPreguntas: BANCO_BASE,
    umbralSuperficial: 40,
  }
}

// Σ pesos = 100 en cada playbook (validado por test).
export const PLAYBOOKS_DEFAULT: Playbook[] = [
  playbook('pb-discovery', 'discovery', 'Discovery estándar', [
    ['problema', 20, true],
    ['impacto', 15, true],
    ['urgencia', 10, false],
    ['proceso_decision', 15, false],
    ['stakeholders', 10, false],
    ['presupuesto', 10, false],
    ['competencia', 10, false],
    ['proximos_pasos', 10, true],
  ]),
  playbook('pb-demo', 'demo', 'Demo de producto', [
    ['problema', 20, true],
    ['impacto', 15, true],
    ['urgencia', 10, false],
    ['proceso_decision', 15, true],
    ['stakeholders', 10, false],
    ['presupuesto', 10, false],
    ['competencia', 10, false],
    ['proximos_pasos', 10, true],
  ]),
  playbook('pb-negociacion', 'negociacion', 'Negociación', [
    ['problema', 10, false],
    ['impacto', 15, true],
    ['urgencia', 15, true],
    ['proceso_decision', 20, true],
    ['stakeholders', 10, false],
    ['presupuesto', 15, true],
    ['competencia', 5, false],
    ['proximos_pasos', 10, true],
  ]),
  playbook('pb-revision', 'revision_tecnica', 'Revisión técnica', [
    ['problema', 20, true],
    ['impacto', 10, false],
    ['urgencia', 10, false],
    ['proceso_decision', 10, false],
    ['stakeholders', 15, true],
    ['presupuesto', 5, false],
    ['competencia', 20, true],
    ['proximos_pasos', 10, true],
  ]),
  playbook('pb-cierre', 'cierre', 'Cierre', [
    ['problema', 5, false],
    ['impacto', 10, false],
    ['urgencia', 15, true],
    ['proceso_decision', 25, true],
    ['stakeholders', 10, false],
    ['presupuesto', 15, true],
    ['competencia', 5, false],
    ['proximos_pasos', 15, true],
  ]),
]

export function playbookPorTipo(tipo: TipoReunion, playbooks: Playbook[] = PLAYBOOKS_DEFAULT): Playbook {
  const encontrado = playbooks.find((p) => p.tipoReunion === tipo)
  if (!encontrado) throw new Error(`No hay playbook para tipo_reunion="${tipo}" — configuración inválida.`)
  return encontrado
}
