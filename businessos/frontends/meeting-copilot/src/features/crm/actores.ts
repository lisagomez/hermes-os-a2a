// Contrato de actores del canal auditado (leads_movimientos.actor):
// 'humano:<email>' | 'agente:<nombre>'. Puro (usable en cliente y tests).

export type TipoActor = 'humano' | 'agente' | 'desconocido'

export function actorInfo(actor: string): { tipo: TipoActor; nombre: string } {
  if (actor.startsWith('humano:')) return { tipo: 'humano', nombre: actor.slice('humano:'.length) }
  if (actor.startsWith('agente:')) return { tipo: 'agente', nombre: actor.slice('agente:'.length) }
  return { tipo: 'desconocido', nombre: actor }
}

export const ICONO_ACTOR: Record<TipoActor, string> = {
  humano: '👤',
  agente: '🤖',
  desconocido: '·',
}
