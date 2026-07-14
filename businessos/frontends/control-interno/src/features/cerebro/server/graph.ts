// Segundo Cerebro — parser server-side (SOLO lectura).
// Convierte .claude/memory (markdown curado, links [x](path) + menciones `foo.md`)
// y .claude/knowledge (frontmatter YAML + wiki links [[...]]) en un grafo.
// NUNCA escribe en esos directorios. Corre en Node (route handlers), jamás en el cliente.
import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type {
  BrokenRef,
  CerebroEdge,
  CerebroEdgeKind,
  CerebroGraph,
  CerebroNode,
  CerebroNodeDetail,
  CerebroNodeType,
} from '../types'

// White-label: point MEMORY_ROOT at YOUR OWN folder of curated markdown — a
// directory that contains `.claude/memory` and/or `.claude/knowledge`. There is
// NO default path; if unset, the Neuronas room renders an honest empty state.
const ROOT_CANDIDATES = [
  process.env.MEMORY_ROOT,
  process.env.BUSINESS_OS_ROOT,
].filter(Boolean) as string[]

function resolveRoot(): string | null {
  for (const candidate of ROOT_CANDIDATES) {
    if (existsSync(path.join(candidate, '.claude', 'memory', 'MEMORY.md'))) {
      return candidate
    }
  }
  return null
}

const MEMORY_SUBDIRS: Record<string, CerebroNodeType> = {
  user: 'user',
  project: 'project',
  feedback: 'feedback',
  reference: 'reference',
}

const KNOWLEDGE_SUBDIRS: Record<string, CerebroNodeType> = {
  concepts: 'concept',
  connections: 'connection',
}

interface ParsedFile {
  id: string
  type: CerebroNodeType
  absPath: string
  title: string
  description: string | null
  excerpt: string
  tags: string[]
  date: string | null
  lines: number
  /** refs crudas encontradas en el archivo, aún sin resolver */
  rawRefs: { ref: string; kind: CerebroEdgeKind }[]
}

// ---------------------------------------------------------------------------
// Helpers de texto
// ---------------------------------------------------------------------------

function stripMd(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstHeading(content: string): string | null {
  const m = content.match(/^#\s+(.+)$/m)
  return m ? stripMd(m[1]) : null
}

function humanize(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/-\d{4}-\d{2}(-\d{2})?$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function extractExcerpt(content: string): string {
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, '')
  const blocks = body.split(/\n\s*\n/)
  for (const block of blocks) {
    const clean = stripMd(
      block
        .split('\n')
        .filter((l) => !/^#{1,6}\s/.test(l))
        .join(' '),
    )
    if (clean.length > 40) {
      return clean.length > 300 ? clean.slice(0, 297) + '…' : clean
    }
  }
  return ''
}

function dateFromFilename(filename: string): string | null {
  const full = filename.match(/(\d{4}-\d{2}-\d{2})/)
  if (full) return full[1]
  const partial = filename.match(/(\d{4}-\d{2})(?!-\d)/)
  if (partial) return `${partial[1]}-01`
  return null
}

function daysSince(date: string | null): number | null {
  if (!date) return null
  const then = new Date(`${date}T00:00:00Z`).getTime()
  if (Number.isNaN(then)) return null
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000))
}

// Frontmatter YAML simple (title/date/tags/connects/sources — el formato real
// del knowledge-compiler; no necesitamos un parser YAML completo)
function parseFrontmatter(content: string): {
  title: string | null
  date: string | null
  tags: string[]
  connects: string[]
} {
  const out: { title: string | null; date: string | null; tags: string[]; connects: string[] } = {
    title: null,
    date: null,
    tags: [],
    connects: [],
  }
  const fm = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fm) return out
  for (const line of fm[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    const [, key, value] = kv
    if (key === 'title') out.title = value.replace(/^["']|["']$/g, '').trim() || null
    if (key === 'date') out.date = value.trim().slice(0, 10) || null
    if (key === 'tags') {
      const arr = value.match(/\[([^\]]*)\]/)
      if (arr) out.tags = arr[1].split(',').map((t) => t.trim()).filter(Boolean)
    }
    if (key === 'connects') {
      for (const m of value.matchAll(/\[\[([^\]]+)\]\]/g)) out.connects.push(m[1])
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Extracción de referencias crudas
// ---------------------------------------------------------------------------

function extractMemoryRefs(content: string): { ref: string; kind: CerebroEdgeKind }[] {
  const refs: { ref: string; kind: CerebroEdgeKind }[] = []
  // [label](ruta.md) — links markdown
  for (const m of content.matchAll(/\[[^\]]*\]\(([^)\s#]+\.md)(?:#[^)]*)?\)/g)) {
    if (!m[1].startsWith('http')) refs.push({ ref: m[1], kind: 'link' })
  }
  // `ruta/archivo.md` o `archivo.md` — menciones en backticks (el patrón "Linaje con")
  for (const m of content.matchAll(/`([A-Za-z0-9_\-./]+\.md)`/g)) {
    refs.push({ ref: m[1], kind: 'mention' })
  }
  return refs
}

function extractKnowledgeRefs(content: string): { ref: string; kind: CerebroEdgeKind }[] {
  const refs: { ref: string; kind: CerebroEdgeKind }[] = []
  const body = content.replace(/^---\n[\s\S]*?\n---/, '')
  // [[wiki links]] en el body (los del frontmatter connects van aparte)
  for (const m of body.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) {
    refs.push({ ref: m[1].trim(), kind: 'wiki' })
  }
  // Menciones a memory/ en backticks (cross-capa)
  for (const m of body.matchAll(/`(?:\.claude\/)?(memory\/[A-Za-z0-9_\-./]+\.md)`/g)) {
    refs.push({ ref: m[1], kind: 'mention' })
  }
  return refs
}

// ---------------------------------------------------------------------------
// Índices curados (descripciones)
// ---------------------------------------------------------------------------

async function readMemoryIndex(memoryRoot: string): Promise<Map<string, string>> {
  const descriptions = new Map<string, string>()
  try {
    const raw = await readFile(path.join(memoryRoot, 'MEMORY.md'), 'utf8')
    for (const m of raw.matchAll(/^\s*-\s*\[[^\]]+\]\(([^)]+\.md)\)\s*—\s*(.+)$/gm)) {
      const clean = stripMd(m[2])
      descriptions.set(
        `memory/${m[1]}`,
        clean.length > 400 ? clean.slice(0, 397) + '…' : clean,
      )
    }
  } catch {
    /* índice ausente: seguimos sin descripciones */
  }
  return descriptions
}

async function readKnowledgeIndex(knowledgeRoot: string): Promise<Map<string, string>> {
  const descriptions = new Map<string, string>()
  try {
    const raw = await readFile(path.join(knowledgeRoot, 'index.md'), 'utf8')
    for (const line of raw.split('\n')) {
      if (!line.startsWith('|')) continue
      const cells = line.split('|').map((c) => c.trim())
      // | [[concepts/x]] | summary | sources | updated |
      const linkCell = cells.find((c) => c.startsWith('[['))
      if (!linkCell) continue
      const ref = linkCell.replace(/^\[\[|\]\]$/g, '')
      const idx = cells.indexOf(linkCell)
      const summary = cells[idx + 1]
      if (summary && summary.length > 10) {
        const clean = stripMd(summary)
        descriptions.set(
          `knowledge/${ref}.md`,
          clean.length > 400 ? clean.slice(0, 397) + '…' : clean,
        )
      }
    }
  } catch {
    /* opcional */
  }
  return descriptions
}

// ---------------------------------------------------------------------------
// Escaneo principal
// ---------------------------------------------------------------------------

async function scanDir(
  dirAbs: string,
  idPrefix: string,
  type: CerebroNodeType,
  layer: 'memory' | 'knowledge',
): Promise<ParsedFile[]> {
  if (!existsSync(dirAbs)) return []
  const entries = await readdir(dirAbs)
  const files: ParsedFile[] = []
  for (const entry of entries.sort()) {
    if (!entry.endsWith('.md')) continue
    const absPath = path.join(dirAbs, entry)
    let content: string
    try {
      content = await readFile(absPath, 'utf8')
    } catch {
      continue
    }
    const id = `${idPrefix}/${entry}`
    if (layer === 'memory') {
      const date = dateFromFilename(entry) ?? (await fileMtimeDate(absPath))
      files.push({
        id,
        type,
        absPath,
        title: firstHeading(content) ?? humanize(entry),
        description: null,
        excerpt: extractExcerpt(content),
        tags: [],
        date,
        lines: content.split('\n').length,
        rawRefs: extractMemoryRefs(content),
      })
    } else {
      const fm = parseFrontmatter(content)
      const rawRefs = extractKnowledgeRefs(content)
      for (const c of fm.connects) rawRefs.push({ ref: c, kind: 'connects' })
      files.push({
        id,
        type,
        absPath,
        title: fm.title ?? firstHeading(content) ?? humanize(entry),
        description: null,
        excerpt: extractExcerpt(content),
        tags: fm.tags,
        date: fm.date ?? (await fileMtimeDate(absPath)),
        lines: content.split('\n').length,
        rawRefs,
      })
    }
  }
  return files
}

async function fileMtimeDate(absPath: string): Promise<string | null> {
  try {
    const s = await stat(absPath)
    return s.mtime.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

// Resuelve una ref cruda a un id de nodo conocido (o null)
function resolveRef(
  ref: string,
  fromId: string,
  ids: Set<string>,
  byBasename: Map<string, string[]>,
): string | null {
  const clean = ref.replace(/^\.\//, '').replace(/^\.claude\//, '')
  const fromDir = path.posix.dirname(fromId) // ej. 'memory/user'
  const layerRoot = fromId.startsWith('memory/') ? 'memory' : 'knowledge'

  const candidates: string[] = []
  if (clean.endsWith('.md')) {
    // rutas explícitas: relativas al índice de capa, a .claude/, o al dir del archivo
    candidates.push(
      clean, // ya viene como memory/... o knowledge/...
      `${layerRoot}/${clean}`,
      path.posix.normalize(path.posix.join(fromDir, clean)),
      `memory/${clean}`,
      `knowledge/${clean}`,
    )
    for (const c of candidates) {
      if (ids.has(c)) return c
    }
    // basename único (menciones tipo `juego-infinito.md`)
    const base = path.posix.basename(clean)
    const matches = byBasename.get(base)
    if (matches && matches.length >= 1) {
      // Preferir misma capa; si sigue ambiguo, tomar el primero (determinista)
      const sameLayer = matches.filter((m) => m.startsWith(layerRoot + '/'))
      return sameLayer[0] ?? matches[0]
    }
    return null
  }

  // wiki links sin extensión: concepts/x, connections/y, o bare 'x'
  if (clean.startsWith('daily/')) return null // logs diarios: fuera del grafo
  candidates.push(
    `knowledge/${clean}.md`,
    `knowledge/concepts/${clean}.md`,
    `knowledge/connections/${clean}.md`,
    `${layerRoot}/${clean}.md`,
  )
  for (const c of candidates) {
    if (ids.has(c)) return c
  }
  return null
}

async function buildGraphUncached(): Promise<CerebroGraph> {
  const root = resolveRoot()
  if (!root) {
    return {
      ok: false,
      reason: 'memory_unavailable',
      nodes: [],
      edges: [],
      meta: {
        generatedAt: new Date().toISOString(),
        fileCount: 0,
        isolatedCount: 0,
        brokenRefs: [],
        tagCounts: {},
      },
    }
  }

  const memoryRoot = path.join(root, '.claude', 'memory')
  const knowledgeRoot = path.join(root, '.claude', 'knowledge')

  const files: ParsedFile[] = []
  for (const [subdir, type] of Object.entries(MEMORY_SUBDIRS)) {
    files.push(...(await scanDir(path.join(memoryRoot, subdir), `memory/${subdir}`, type, 'memory')))
  }
  for (const [subdir, type] of Object.entries(KNOWLEDGE_SUBDIRS)) {
    files.push(
      ...(await scanDir(path.join(knowledgeRoot, subdir), `knowledge/${subdir}`, type, 'knowledge')),
    )
  }

  // Descripciones curadas de los índices
  const [memDesc, knowDesc] = await Promise.all([
    readMemoryIndex(memoryRoot),
    readKnowledgeIndex(knowledgeRoot),
  ])
  for (const f of files) {
    f.description = memDesc.get(f.id) ?? knowDesc.get(f.id) ?? null
  }

  // Índices de resolución
  const ids = new Set(files.map((f) => f.id))
  const byBasename = new Map<string, string[]>()
  for (const f of files) {
    const base = path.posix.basename(f.id)
    byBasename.set(base, [...(byBasename.get(base) ?? []), f.id])
  }

  // Aristas
  const edgeKeys = new Set<string>()
  const edges: CerebroEdge[] = []
  const brokenRefs: BrokenRef[] = []
  const addEdge = (source: string, target: string, kind: CerebroEdgeKind) => {
    if (source === target) return
    // una arista por par (independiente de dirección) y por kind estructural vs tag
    const [a, b] = [source, target].sort()
    const key = `${a}→${b}:${kind === 'tag' ? 'tag' : 'ref'}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push({ source, target, kind })
  }

  // Una ref que apunta fuera del corpus (skills, accelerator/, docs/, repo en
  // general) es EXTERNA, no rota. Rota = parece del corpus pero no resuelve.
  const CORPUS_PREFIX =
    /^(\.claude\/)?(memory|knowledge|user|project|feedback|reference|concepts|connections)\//
  const looksInCorpus = (ref: string) => !ref.includes('/') || CORPUS_PREFIX.test(ref)

  for (const f of files) {
    for (const { ref, kind } of f.rawRefs) {
      const target = resolveRef(ref, f.id, ids, byBasename)
      if (target) {
        addEdge(f.id, target, kind)
      } else if (!ref.startsWith('daily/') && !/^https?:/.test(ref) && looksInCorpus(ref)) {
        brokenRefs.push({ from: f.id, ref })
      }
    }
  }

  // Aristas por tags compartidos (solo knowledge, ≥2 tags en común, tags no genéricos)
  const tagCounts: Record<string, number> = {}
  for (const f of files) {
    for (const t of f.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1
  }
  const tagged = files.filter((f) => f.tags.length > 0)
  for (let i = 0; i < tagged.length; i++) {
    for (let j = i + 1; j < tagged.length; j++) {
      const shared = tagged[i].tags.filter(
        (t) => tagged[j].tags.includes(t) && (tagCounts[t] ?? 0) <= 10,
      )
      if (shared.length >= 2) addEdge(tagged[i].id, tagged[j].id, 'tag')
    }
  }

  // Grados
  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }

  const nodes: CerebroNode[] = files.map((f) => ({
    id: f.id,
    type: f.type,
    title: f.title,
    description: f.description,
    excerpt: f.excerpt,
    tags: f.tags,
    date: f.date,
    daysOld: daysSince(f.date),
    lines: f.lines,
    degree: degree.get(f.id) ?? 0,
  }))

  return {
    ok: true,
    nodes,
    edges,
    meta: {
      generatedAt: new Date().toISOString(),
      fileCount: files.length,
      isolatedCount: nodes.filter((n) => n.degree === 0).length,
      brokenRefs: brokenRefs.slice(0, 100),
      tagCounts,
    },
  }
}

// Cache con TTL corto: el corpus cambia poco y el scan completo es ~100 archivos
let cache: { graph: CerebroGraph; ts: number } | null = null
const CACHE_TTL_MS = 30_000

export async function buildGraph(force = false): Promise<CerebroGraph> {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS && cache.graph.ok) {
    return cache.graph
  }
  const graph = await buildGraphUncached()
  cache = { graph, ts: Date.now() }
  return graph
}

// ---------------------------------------------------------------------------
// Detalle de un nodo (contenido completo + backlinks resueltos)
// ---------------------------------------------------------------------------

const SAFE_ID = /^(memory|knowledge)\/[A-Za-z0-9_\-./]+\.md$/

export async function getNodeDetail(id: string): Promise<CerebroNodeDetail | null> {
  if (!SAFE_ID.test(id) || id.includes('..')) return null
  const root = resolveRoot()
  if (!root) return null
  const graph = await buildGraph()
  const node = graph.nodes.find((n) => n.id === id)
  if (!node) return null

  const absPath = path.join(root, '.claude', id)
  // Guardia anti path-traversal: el resuelto debe seguir dentro de .claude/
  if (!absPath.startsWith(path.join(root, '.claude') + path.sep)) return null

  let content: string
  try {
    content = await readFile(absPath, 'utf8')
  } catch {
    return null
  }

  const titleOf = new Map(graph.nodes.map((n) => [n.id, n]))
  const outlinks = graph.edges
    .filter((e) => e.source === id && e.kind !== 'tag')
    .map((e) => ({ id: e.target, kind: e.kind, ...pick(titleOf.get(e.target)) }))
  const backlinks = graph.edges
    .filter((e) => e.target === id && e.kind !== 'tag')
    .map((e) => ({ id: e.source, kind: e.kind, ...pick(titleOf.get(e.source)) }))

  return {
    ...node,
    content,
    sourcePath: `.claude/${id}`,
    outlinks,
    backlinks,
  }
}

function pick(node: CerebroNode | undefined): { title: string; type: CerebroNodeType } {
  return { title: node?.title ?? '(desconocido)', type: node?.type ?? 'concept' }
}

// ---------------------------------------------------------------------------
// Selección de slice para síntesis (cuando el usuario no elige nodos)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'para', 'como', 'esta', 'este', 'esto', 'pero', 'donde', 'cuando', 'sobre',
  'entre', 'desde', 'hasta', 'porque', 'que', 'con', 'una', 'unos', 'unas',
  'los', 'las', 'del', 'mas', 'más', 'muy', 'hay', 'fue', 'ser', 'son',
  'tiene', 'tengo', 'hacer', 'hago', 'puedo', 'quiero', 'debo', 'deberia',
  'debería', 'cual', 'cuál', 'cuales', 'todo', 'todos', 'nada', 'algo',
  'aprendimos', 'aprendi', 'aprendí', 'dime', 'dame', 'necesito', 'ayuda',
  'the', 'and', 'for', 'with', 'what', 'how', 'why', 'about',
])

export async function autoSelectNodes(question: string, limit = 8): Promise<string[]> {
  const graph = await buildGraph()
  const tokens = question
    .toLowerCase()
    .split(/[^a-záéíóúñü0-9-]+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t))
  if (tokens.length === 0) return []

  // Haystacks por nodo + IDF por token: "benja"/"imperio" (raros) pesan mucho
  // más que "saas"/"factory" (aparecen en medio corpus y solo meten ruido).
  const stacks = graph.nodes.map((n) => ({
    id: n.id,
    degree: n.degree,
    title: `${n.title} ${n.id}`.toLowerCase(),
    tags: n.tags.join(' ').toLowerCase(),
    body: `${n.description ?? ''} ${n.excerpt}`.toLowerCase(),
  }))
  const idf = new Map<string, number>()
  for (const t of tokens) {
    const df = stacks.filter((s) => s.title.includes(t) || s.tags.includes(t) || s.body.includes(t)).length
    idf.set(t, Math.log((stacks.length + 1) / (df + 1)))
  }
  const scored = stacks
    .map((s) => {
      let score = 0
      for (const t of tokens) {
        const w = idf.get(t) ?? 0
        if (w <= 0.05) continue // token omnipresente: no discrimina
        if (s.title.includes(t)) score += 3 * w
        if (s.tags.includes(t)) score += 2 * w
        if (s.body.includes(t)) score += 1 * w
      }
      return { id: s.id, score: score + Math.min(s.degree, 5) * 0.05 }
    })
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.id)
}

// Caps pensados para el MAX_INPUT_LENGTH=50K de claudeclaw: contenido 40K +
// preámbulo del prompt ≈ 42K, nunca se trunca del lado del agente.
export async function readNodeContents(
  nodeIds: string[],
  perNodeCap = 6000,
  totalCap = 40_000,
): Promise<{ id: string; title: string; content: string }[]> {
  const out: { id: string; title: string; content: string }[] = []
  let total = 0
  for (const id of nodeIds) {
    const detail = await getNodeDetail(id)
    if (!detail) continue
    let content = detail.content
    if (content.length > perNodeCap) {
      content = content.slice(0, perNodeCap) + '\n\n[…truncado…]'
    }
    if (total + content.length > totalCap) break
    total += content.length
    out.push({ id, title: detail.title, content })
  }
  return out
}
