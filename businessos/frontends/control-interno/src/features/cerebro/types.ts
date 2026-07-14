// Segundo Cerebro — tipos compartidos entre el parser server-side y la UI.
// Nodo = archivo curado (.claude/memory) o compilado (.claude/knowledge).
// Los IDs son rutas relativas a .claude/ (ej. 'memory/user/example.md').

export type CerebroNodeType =
  | 'user'
  | 'project'
  | 'feedback'
  | 'reference'
  | 'concept'
  | 'connection'

export type CerebroEdgeKind = 'link' | 'mention' | 'wiki' | 'connects' | 'tag'

export interface CerebroNode {
  id: string
  type: CerebroNodeType
  title: string
  /** Descripción curada (MEMORY.md / knowledge index.md) si existe */
  description: string | null
  /** Primer párrafo del archivo, sin markdown */
  excerpt: string
  tags: string[]
  /** YYYY-MM-DD — filename (memory) o frontmatter (knowledge); fallback mtime */
  date: string | null
  daysOld: number | null
  lines: number
  degree: number
}

export interface CerebroEdge {
  source: string
  target: string
  kind: CerebroEdgeKind
}

export interface BrokenRef {
  from: string
  ref: string
}

export interface CerebroGraph {
  ok: boolean
  reason?: string
  nodes: CerebroNode[]
  edges: CerebroEdge[]
  meta: {
    generatedAt: string
    fileCount: number
    isolatedCount: number
    brokenRefs: BrokenRef[]
    /** tag → cuántos nodos lo llevan (para chips/filtros) */
    tagCounts: Record<string, number>
  }
}

export interface CerebroNodeDetail extends CerebroNode {
  /** Markdown completo del archivo (read-only) */
  content: string
  /** Ruta absoluta legible para mostrar la fuente */
  sourcePath: string
  outlinks: CerebroLinkRef[]
  backlinks: CerebroLinkRef[]
}

export interface CerebroLinkRef {
  id: string
  title: string
  type: CerebroNodeType
  kind: CerebroEdgeKind
}

export type SynthesisMode = 'brief' | 'simple' | 'journey'

export const TYPE_META: Record<
  CerebroNodeType,
  { label: string; color: string; group: 'memoria' | 'knowledge' }
> = {
  user: { label: process.env.NEXT_PUBLIC_OWNER_NAME || 'Owner', color: '#ff9101', group: 'memoria' },
  project: { label: 'Proyectos', color: '#8B5CF6', group: 'memoria' },
  feedback: { label: 'Reglas', color: '#f43f5e', group: 'memoria' },
  reference: { label: 'Referencias', color: '#38bdf8', group: 'memoria' },
  concept: { label: 'Conceptos', color: '#34d399', group: 'knowledge' },
  connection: { label: 'Conexiones', color: '#ec4899', group: 'knowledge' },
}

export const SYNTHESIS_MODES: Record<
  SynthesisMode,
  { label: string; hint: string }
> = {
  brief: {
    label: 'Brief de decisión',
    hint: 'Contexto → opciones → recomendación → siguiente acción',
  },
  simple: {
    label: 'Explicado simple',
    hint: 'HTML navegable para que un principiante lo entienda',
  },
  journey: {
    label: 'Journey',
    hint: 'Historia cronológica que cruza los nodos elegidos',
  },
}
