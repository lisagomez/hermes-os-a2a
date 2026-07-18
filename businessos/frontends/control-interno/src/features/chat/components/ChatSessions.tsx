'use client'
import { MessageSquare, Plus } from 'lucide-react'
import type { ChatSession } from '../hooks/useChatHistory'
import { SessionItem } from './SessionItem'

interface ChatSessionsProps {
  sessions: ChatSession[]
  loading: boolean
  activeId: string | null
  onSelect: (session: ChatSession) => void
  onNew: () => void
  onDelete: (sessionId: string) => void
  onToggleFavorite: (sessionId: string) => void
  onRename: (sessionId: string, title: string) => void
}

export function ChatSessions({
  sessions,
  loading,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onToggleFavorite,
  onRename,
}: ChatSessionsProps) {
  return (
    <div className="flex flex-col h-full border-r border-border-subtle">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-3 border-b border-border-subtle">
        <span className="text-[10px] uppercase tracking-widest text-muted/80 font-semibold">
          Conversaciones
        </span>
        <button
          onClick={onNew}
          title="Nueva conversación"
          className="icon-btn size-7"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
        {loading ? (
          <div className="space-y-1.5 px-2 py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-3 py-8 text-center">
            <MessageSquare size={20} className="text-muted/40" />
            <p className="text-[11px] text-muted/70">Sin historial</p>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              active={activeId === session.id}
              onSelect={() => onSelect(session)}
              onDelete={() => onDelete(session.id)}
              onToggleFavorite={() => onToggleFavorite(session.id)}
              onRename={(title) => onRename(session.id, title)}
            />
          ))
        )}
      </div>
    </div>
  )
}
