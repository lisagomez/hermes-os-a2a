'use client'
import { useState } from 'react'
import { Zap } from 'lucide-react'
import type { UsageMeta } from '../hooks/useChat'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

export function UsageBadge({ usage }: { usage: UsageMeta }) {
  const [expanded, setExpanded] = useState(false)

  const hasContext = usage.contextUsed != null && usage.contextTotal != null && usage.contextTotal > 0
  const totalTokens = usage.inputTokens + usage.outputTokens

  if (!hasContext && totalTokens === 0) return null

  const pct = hasContext ? Math.round((usage.contextUsed! / usage.contextTotal!) * 100) : 0
  const colorClass = pct >= 90 ? 'text-red-400/60' : pct >= 70 ? 'text-amber-400/40' : 'text-muted/60'

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${colorClass} hover:text-muted hover:bg-card transition-colors`}
      title={hasContext ? `Contexto: ${pct}% usado` : 'Token usage'}
    >
      <Zap size={9} />
      {expanded ? (
        <span className="flex items-center gap-1.5">
          {hasContext && (
            <>
              <span>{formatTokens(usage.contextUsed!)} / {formatTokens(usage.contextTotal!)}</span>
              <span className="text-muted/30">·</span>
            </>
          )}
          <span>{formatTokens(usage.inputTokens)} in</span>
          <span className="text-muted/30">·</span>
          <span>{formatTokens(usage.outputTokens)} out</span>
          <span className="text-muted/30">·</span>
          <span>{formatDuration(usage.durationMs)}</span>
          {usage.costUsd > 0 && (
            <>
              <span className="text-muted/30">·</span>
              <span>${usage.costUsd.toFixed(4)}</span>
            </>
          )}
        </span>
      ) : (
        <span>
          {hasContext
            ? `${formatTokens(usage.contextUsed!)} / ${formatTokens(usage.contextTotal!)}`
            : `${formatTokens(totalTokens)} tokens`
          }
        </span>
      )}
    </button>
  )
}
