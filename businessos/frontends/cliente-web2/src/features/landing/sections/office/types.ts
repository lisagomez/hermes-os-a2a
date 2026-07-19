// Tipos del simulador de oficina A2A (sección OfficeSim).

/** Estado visible de un agente en la escena. */
export type AgentState = 'working' | 'walking' | 'idle' | 'celebrating';

/** Zonas comunes a las que un agente puede caminar. */
export type Zone = 'meeting' | 'cafe';

/** Punto en coordenadas internas de la escena (porcentaje 0–100). */
export interface Point {
  x: number;
  y: number;
}

/** Rectángulo en coordenadas internas de la escena (porcentaje 0–100). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Snapshot de render de un agente (lo que consume el componente). */
export interface AgentRender {
  id: string;
  state: AgentState;
  /** left % del centro del orbe */
  x: number;
  /** top % del centro del orbe */
  y: number;
  /** índice actual sobre agent.demo */
  lineIdx: number;
  /** true si el agente mira a la izquierda (sprite espejado). Lo calcula el motor
   *  al mover —donde conoce la x previa—, para que el render sea puro (sin refs). */
  mirror: boolean;
}

/** Estado completo de la oficina, indexado por agent.id. */
export type OfficeState = Record<string, AgentRender>;
