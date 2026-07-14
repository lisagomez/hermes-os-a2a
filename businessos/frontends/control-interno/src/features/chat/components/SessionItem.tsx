'use client'
import { useEffect, useRef, useState } from 'react'
import { Clock, MoreHorizontal, Star, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ChatSession } from '../hooks/useChatHistory'

// ─── Shared session list item ──────────────────────────────────────────────────
//
// Single source of truth for chat session rows. Used by ChatSessions (sidebar /chat).
//
// Renders title + meta line (icon + relative time + optional CLI chip for SDK
// sessions) + a three-dot menu with favorite/rename/delete. Inline rename via
// keyboard (Enter/Escape) when editing. Menu auto-closes on outside click.
//
// The "Automatizaciones" session is treated as protected: rename/delete hidden.

export interface SessionItemProps {
  session: ChatSession
  active: boolean
  onSelect: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onRename: (title: string) => void
}

export function SessionItem({
  session,
  active,
  onSelect,
  onDelete,
  onToggleFavorite,
  onRename,
}: SessionItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.title)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const timeAgo = formatDistanceToNow(new Date(session.updated_at), {
    addSuffix: false,
    locale: es,
  })

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Focus input when editing starts
  useEffect(() => {
    if (editing) {
      setEditValue(session.title)
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [editing, session.title])

  const commitRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== session.title) onRename(trimmed)
    setEditing(false)
  }

  const isProtected = session.title === 'Automatizaciones'

  const handleMenuAction = (action: 'favorite' | 'rename' | 'delete') => {
    setMenuOpen(false)
    if (action === 'favorite') onToggleFavorite()
    if (action === 'rename' && !isProtected) setEditing(true)
    if (action === 'delete' && !isProtected) onDelete()
  }

  return (
    <div
      className={`group relative mx-1.5 rounded-lg border transition-all
        ${active ? 'nav-item-active border-border-accent' : 'border-transparent hover:bg-card-hover'}`}
    >
      {/* Clickable area */}
      <div
        onClick={() => !editing && onSelect()}
        className="flex flex-col gap-0.5 px-2.5 py-2 cursor-pointer pr-8"
      >
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            className="input-field px-1.5 py-0.5 text-xs"
          />
        ) : (
          <p className={`text-xs font-medium leading-snug line-clamp-2 ${active ? 'text-foreground' : 'text-muted group-hover:text-foreground/75'}`}>
            {session.title}
          </p>
        )}

        {!editing && (
          // Conversaciones UNIFICADAS (2026-07-08): chat y CLI son el mismo
          // historial por cuenta — sin distintivo "CLI" ni icono aparte.
          <div className="flex items-center gap-1 text-[10px] text-muted/70">
            {isProtected ? (
              <Clock size={9} className="text-emerald-400/80 shrink-0" />
            ) : session.is_favorite ? (
              <Star size={9} className="text-amber-400/70 fill-amber-400/70 shrink-0" />
            ) : (
              <Clock size={9} className="shrink-0" />
            )}
            <span className="truncate">{timeAgo}</span>
          </div>
        )}
      </div>

      {/* Three-dot button */}
      {!editing && (
        <div className="absolute top-2 right-1.5" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className={`
              flex items-center justify-center min-w-[32px] min-h-[32px] md:min-w-0 md:min-h-0 md:p-1 rounded transition-colors
              ${menuOpen
                ? 'bg-card-active text-foreground/70'
                : 'text-muted/50 md:text-foreground/0 md:group-hover:text-muted/80 hover:!text-foreground/70 hover:bg-card-active'
              }
            `}
            title="Opciones"
            aria-label="Opciones de conversación"
          >
            <MoreHorizontal size={12} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="titanium-panel absolute right-0 top-full mt-1 z-50 w-36 overflow-hidden">
              <button
                onClick={() => handleMenuAction('favorite')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground/70 hover:bg-card-hover hover:text-foreground transition-colors"
              >
                <Star size={12} className={session.is_favorite ? 'text-amber-400 fill-amber-400' : ''} />
                {session.is_favorite ? 'Quitar favorito' : 'Favorito'}
              </button>
              {!isProtected && (
                <button
                  onClick={() => handleMenuAction('rename')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground/70 hover:bg-card-hover hover:text-foreground transition-colors"
                >
                  <Pencil size={12} />
                  Renombrar
                </button>
              )}
              {!isProtected && (
                <>
                  <div className="h-px bg-card-hover" />
                  <button
                    onClick={() => handleMenuAction('delete')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                    Eliminar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
