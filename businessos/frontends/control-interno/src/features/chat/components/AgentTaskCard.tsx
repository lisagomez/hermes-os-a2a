'use client'
import { useState } from 'react'
import { Loader2, Check, X, Bot, Workflow, Terminal, Pause } from 'lucide-react'
import type { AgentTask } from '../hooks/useChat'

// Cards vivas de subagentes/workflows en background (SDK 0.3.201: task_started →
// task_progress → task_notification). Paridad con el agent-view de Claude Code:
// se ve QUÉ agente corre, cuántos tokens lleva, su última tool y el resumen final.

const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${Math.round(n / 1_000)}K`
  : String(n)

function taskIcon(task: AgentTask) {
  if (task.taskType === 'local_workflow' || task.workflowName) return Workflow
  if (task.taskType === 'shell') return Terminal
  return Bot
}

function statusVisual(status: AgentTask['status']) {
  switch (status) {
    case 'running':
    case 'pending':
      return { border: 'border-brand/25', bg: 'bg-brand/10', label: 'text-brand-ink' }
    case 'completed':
      return { border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.06]', label: 'text-emerald-300/90' }
    case 'failed':
    case 'killed':
      return { border: 'border-error/25', bg: 'bg-error/[0.07]', label: 'text-error' }
    default:
      return { border: 'border-border-subtle', bg: 'bg-card', label: 'text-muted' }
  }
}

function StatusIcon({ status }: { status: AgentTask['status'] }) {
  if (status === 'running' || status === 'pending') return <Loader2 size={11} className="animate-spin shrink-0 text-brand-ink" />
  if (status === 'completed') return <Check size={11} className="shrink-0 text-emerald-400" />
  if (status === 'paused') return <Pause size={11} className="shrink-0 text-muted" />
  return <X size={11} className="shrink-0 text-error" />
}

function TaskCard({ task }: { task: AgentTask }) {
  // El summary final puede ser un párrafo completo — clamp a 2 líneas con
  // tap-to-expand (sin perder información, sin inflar el turno por default).
  const [expanded, setExpanded] = useState(false)
  const Icon = taskIcon(task)
  const v = statusVisual(task.status)
  const running = task.status === 'running' || task.status === 'pending'
  const chip = task.workflowName
    ? `workflow: ${task.workflowName}`
    : task.subagentType ?? task.taskType ?? 'agente'
  return (
    <div className={`rounded-xl border px-2.5 py-1.5 text-[11px] transition-all duration-300 ${v.border} ${v.bg}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <StatusIcon status={task.status} />
        <Icon size={11} className={`shrink-0 ${v.label}`} />
        <span className={`font-medium truncate ${v.label}`}>{task.description || 'Subagente'}</span>
        <span className="ml-auto shrink-0 px-1.5 py-px rounded-full bg-black/20 border border-white/[0.06] text-[9px] text-muted/90 font-mono">
          {chip}
        </span>
      </div>
      {(running && (task.totalTokens != null || task.lastToolName)) && (
        <div className="mt-1 pl-[34px] flex items-center gap-2 text-[10px] text-muted/80">
          {task.totalTokens != null && <span className="font-mono">{fmtTokens(task.totalTokens)} tokens</span>}
          {task.toolUses != null && task.toolUses > 0 && <span className="font-mono">{task.toolUses} tools</span>}
          {task.lastToolName && <span className="truncate">· {task.lastToolName}</span>}
        </div>
      )}
      {!running && (task.summary || task.error) && (
        <p
          onClick={() => setExpanded((e) => !e)}
          className={`mt-1 pl-[34px] text-[10px] text-muted/85 leading-snug cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
          title={expanded ? 'Colapsar' : 'Ver completo'}
        >
          {task.error ?? task.summary}
          {task.totalTokens != null && (
            <span className="font-mono text-muted/60"> · {fmtTokens(task.totalTokens)} tokens</span>
          )}
        </p>
      )}
    </div>
  )
}

export function AgentTaskCards({ tasks }: { tasks: AgentTask[] }) {
  if (!tasks.length) return null

  return (
    // aria-hidden: chrome del turno — iOS Speak Screen solo debe leer la respuesta
    <div aria-hidden className="flex flex-col gap-1.5 my-1.5">
      {tasks.map((task) => (
        <TaskCard key={task.taskId} task={task} />
      ))}
    </div>
  )
}
