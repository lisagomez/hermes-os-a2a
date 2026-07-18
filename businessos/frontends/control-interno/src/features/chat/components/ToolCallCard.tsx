'use client'
import { useState } from 'react'
import { Loader2, Check, Wrench, ChevronDown, ChevronUp } from 'lucide-react'
import type { ToolCall } from '../hooks/useChat'

const TOOL_LABELS: Record<string, string> = {
  Read: 'Leyendo archivo',
  Write: 'Escribiendo archivo',
  Edit: 'Editando archivo',
  Bash: 'Ejecutando comando',
  Glob: 'Buscando archivos',
  Grep: 'Buscando en codigo',
  WebSearch: 'Buscando en web',
  WebFetch: 'Cargando pagina',
  Agent: 'Delegando a subagente',
  Skill: 'Ejecutando skill',
  TodoWrite: 'Actualizando TODOs',
}

function getToolLabel(toolName: string): string {
  // Handle MCP tools like mcp__supabase__execute_sql
  if (toolName.startsWith('mcp__')) {
    const parts = toolName.split('__')
    return parts.length >= 3 ? `${parts[1]}: ${parts.slice(2).join(' ')}` : toolName
  }
  return TOOL_LABELS[toolName] ?? toolName
}

// Parse partial JSON defensively. The model emits incremental JSON via input_json_delta
// so by the time we want to render a preview, the JSON is almost always incomplete
// (e.g. `{"command": "npm inst`). We try to extract the most useful field for each tool.
function previewToolInput(toolName: string, partial: string | undefined): string | null {
  if (!partial) return null
  // Try parse as-is first (sometimes the model emits closing braces fast enough)
  let obj: Record<string, unknown> | null = null
  try { obj = JSON.parse(partial) } catch { /* ignore */ }

  // Heuristic: extract first string-quoted value for the field we care about
  const extractField = (field: string): string | null => {
    // Match: "field": "value-so-far  (handles unclosed quote)
    const re = new RegExp(`"${field}"\\s*:\\s*"([^"]*)`, 's')
    const m = partial.match(re)
    return m?.[1] ?? null
  }

  const trim = (s: string, max: number) => s.length > max ? s.slice(0, max) + '…' : s

  if (toolName === 'Bash') {
    const cmd = (obj?.command as string | undefined) ?? extractField('command')
    return cmd ? trim(cmd, 80) : null
  }
  if (toolName === 'Read') {
    const fp = (obj?.file_path as string | undefined) ?? extractField('file_path')
    return fp ? fp.split('/').slice(-2).join('/') : null
  }
  if (toolName === 'Write' || toolName === 'Edit') {
    const fp = (obj?.file_path as string | undefined) ?? extractField('file_path')
    return fp ? fp.split('/').slice(-2).join('/') : null
  }
  if (toolName === 'Grep') {
    const pat = (obj?.pattern as string | undefined) ?? extractField('pattern')
    return pat ? trim(pat, 60) : null
  }
  if (toolName === 'Glob') {
    const pat = (obj?.pattern as string | undefined) ?? extractField('pattern')
    return pat ? trim(pat, 60) : null
  }
  if (toolName === 'WebFetch' || toolName === 'WebSearch') {
    const q = (obj?.url as string | undefined) ?? (obj?.query as string | undefined)
      ?? extractField('url') ?? extractField('query')
    return q ? trim(q, 60) : null
  }
  if (toolName.startsWith('mcp__')) {
    // Generic: first string field we find
    const firstStringMatch = partial.match(/"([^"]+)"\s*:\s*"([^"]{1,80})/)
    return firstStringMatch ? trim(firstStringMatch[2], 60) : null
  }
  return null
}

interface Props {
  tools: ToolCall[]
  inputs?: Record<string, string>
}

// Turnos pesados (research con 8-10 tools) colapsan las pills terminadas en un
// chip "N herramientas" expandible — las que CORREN siguen visibles (feedback
// vivo), y la respuesta no queda empujada por un muro de pills.
const COLLAPSE_AT = 6

export function ToolCallCards({ tools, inputs }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (!tools.length) return null

  const shouldCollapse = tools.length > COLLAPSE_AT && !expanded
  const visible = shouldCollapse ? tools.filter((t) => t.status === 'running') : tools
  const hiddenCount = tools.length - visible.length

  return (
    // aria-hidden: chrome del turno — iOS Speak Screen solo debe leer la respuesta
    <div aria-hidden className="flex flex-wrap gap-1.5 my-1.5">
      {shouldCollapse && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-card border border-border-subtle text-muted hover:text-foreground/75 hover:border-border transition-colors"
          aria-expanded={false}
        >
          <Check size={10} className="shrink-0" />
          {hiddenCount} herramientas
          <ChevronDown size={10} className="shrink-0" />
        </button>
      )}
      {visible.map((tool) => {
        const preview = previewToolInput(tool.toolName, inputs?.[tool.toolId])
        return (
          <span
            key={tool.toolId}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300 max-w-full
              ${tool.status === 'running'
                ? 'bg-card border border-border text-foreground/75'
                : 'bg-card border border-border-subtle text-muted'
              }`}
          >
            {tool.status === 'running' ? (
              <Loader2 size={10} className="animate-spin shrink-0" />
            ) : (
              <Check size={10} className="shrink-0" />
            )}
            <span className="truncate">
              {getToolLabel(tool.toolName)}
              {preview && <span className="text-muted/80 font-mono ml-1.5">{preview}</span>}
            </span>
          </span>
        )
      })}
      {expanded && tools.length > COLLAPSE_AT && (
        <button
          onClick={() => setExpanded(false)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-muted/70 hover:text-muted transition-colors"
          aria-expanded={true}
        >
          <ChevronUp size={10} className="shrink-0" />
          ocultar
        </button>
      )}
    </div>
  )
}

export function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted/60">
      <Wrench size={10} className="animate-pulse" />
      Procesando...
    </span>
  )
}
