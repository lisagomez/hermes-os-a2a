'use client'
import { useState, useEffect, useCallback } from 'react'
import { cacheSnapshot, getCachedSnapshot } from '@/lib/local-first'
import type { MessageMetadata } from './useChat'

export interface ChatSession {
  id: string
  title: string
  is_favorite: boolean
  profile_id: string | null
  created_at: string
  updated_at: string
  /** SDK-only sessions have their sessionId here for resume */
  sdkSessionId?: string
  /** True if this session comes from SDK (Claude Code CLI) and has no Supabase entry */
  isSDKOnly?: boolean
}

export interface PersistedMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  audio_url?: string | null
  image_url?: string | null
  metadata?: MessageMetadata | null
}

function sessionSort(a: ChatSession, b: ChatSession): number {
  const aIsAuto = a.title === 'Automatizaciones'
  const bIsAuto = b.title === 'Automatizaciones'
  if (aIsAuto !== bIsAuto) return aIsAuto ? -1 : 1
  if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1
  return b.updated_at.localeCompare(a.updated_at)
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)

  const cacheKey = 'chat:sessions'

  // Load session list on mount — stale-while-revalidate:
  // pinta el cache al instante, refresca en background.
  useEffect(() => {
    let active = true
    setSessions([])
    setLoading(true)
    getCachedSnapshot<ChatSession[]>(cacheKey)
      .then((cached) => { if (active && cached?.length) { setSessions(cached); setLoading(false) } })
      .catch(() => {})
      .finally(() => { if (active) loadSessions() })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Noise patterns: cron jobs, /status, system commands — not real conversations
  const SDK_NOISE = /^(Unknown skill:|Intel scan|Gmail cleanup|Morning |Business Council|Monthly|System Council|Funnel|Workspace|Metrics|polar-sync|autoresearch|churn|youtube-|video-|intel-|twitter-|news-|calendar-sync|evening-|morning-habits|Haz git pull|polar_sync|knowledge-compile|\/status|\/compact|\/context|\/model|testing$)/i

  const loadSessions = useCallback(async () => {
    setLoading(true)

    // 1. Load MC sessions through the local/server auth layer.
    const mcRes = await fetch(`/api/chat/sessions?source=mc&limit=30`, { cache: 'no-store' })
    const mcJson = await mcRes.json().catch(() => ({})) as { sessions?: ChatSession[] }
    const mcSessions = mcRes.ok ? ((mcJson.sessions as ChatSession[]) ?? []) : []

    // Show MC sessions immediately — don't wait for SDK
    const sortedMc = mcSessions.sort(sessionSort)
    setSessions(sortedMc)
    setLoading(false)
    cacheSnapshot('chat', cacheKey, sortedMc).catch(() => {})

    // 2. Fetch SDK sessions in background (slower — disk I/O via ClaudeClaw).
    // TEMPORAL: por cuenta — cada espacio lista su propio pool de transcritos en
    // disco (~/.claude para 'default', ~/.claude-bro para 'bro'). Así las convos
    // del CLI y del chat quedan UNIFICADAS en un solo historial por cuenta.
    try {
      const res = await fetch(`/api/chat/sessions?limit=20`)
      if (!res.ok) return
      const { sessions: sdkSessions } = await res.json() as {
        sessions: Array<{
          sessionId: string
          summary: string
          lastModified: number
          fileSize: number
          customTitle?: string
          firstPrompt?: string
          linkedChatSessionId: string | null
        }>
      }

      const mcIds = new Set(mcSessions.map((s) => s.id))
      const sdkOnlySessions: ChatSession[] = sdkSessions
        // Filter out sessions already linked to MC
        .filter((s) => !s.linkedChatSessionId || !mcIds.has(s.linkedChatSessionId))
        // Filter out noise (cron jobs, /status, system commands)
        .filter((s) => {
          const title = s.customTitle || s.summary || s.firstPrompt || ''
          return !SDK_NOISE.test(title) && title.length > 5 && s.fileSize > 500
        })
        .map((s) => ({
          id: `sdk:${s.sessionId}`,
          title: s.customTitle || s.summary || s.firstPrompt?.slice(0, 60) || 'Claude Code session',
          is_favorite: false,
          profile_id: null,
          created_at: new Date(s.lastModified).toISOString(),
          updated_at: new Date(s.lastModified).toISOString(),
          sdkSessionId: s.sessionId,
          isSDKOnly: true,
        }))

      if (sdkOnlySessions.length > 0) {
        setSessions((prev) => {
          const next = [...prev.filter((s) => !s.isSDKOnly), ...sdkOnlySessions].sort(sessionSort)
          cacheSnapshot('chat', cacheKey, next).catch(() => {})
          return next
        })
      }
    } catch { /* ClaudeClaw offline — MC sessions only, no error */ }
  }, [cacheKey])

  const createSession = useCallback(async (firstMessage: string): Promise<ChatSession> => {
    // Optimistic title while AI generates
    const fallbackTitle = firstMessage.slice(0, 55) + (firstMessage.length > 55 ? '…' : '')

    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // TEMPORAL: la nueva conversación nace en el espacio de cuenta activo.
      body: JSON.stringify({ title: fallbackTitle, firstMessage }),
    })
    const json = await res.json().catch(() => ({})) as { session?: ChatSession; error?: string }
    if (!res.ok || !json.session) throw new Error(json.error ?? 'Failed to create session')
    const session = json.session
    setSessions((prev) => [session, ...prev])

    // Generate AI title in background — update when ready
    fetch('/api/chat/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: firstMessage }),
    })
      .then((r) => r.json())
      .then(({ title }: { title?: string }) => {
        if (!title || title === fallbackTitle) return
        fetch('/api/chat/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, title }),
        }).catch(() => {})
        setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, title } : s))
      })
      .catch(() => { /* silent */ })

    return session
  }, [])

  // Solo estado local: el POST de mensajes YA toca updated_at server-side.
  // El PATCH extra era un round-trip redundante en el critical path del envío.
  const updateSessionTimestamp = useCallback(async (sessionId: string) => {
    const now = new Date().toISOString()
    setSessions((prev) =>
      prev
        .map((s) => (s.id === sessionId ? { ...s, updated_at: now } : s))
        .sort(sessionSort),
    )
  }, [])

  const saveMessages = useCallback(
    async (
      sessionId: string,
      messages: Array<{ role: 'user' | 'assistant'; content: string; audioUrl?: string; imageUrl?: string; metadata?: Record<string, unknown> }>,
    ) => {
      const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      const json = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        console.error('[saveMessages] Insert error:', json.error)
        throw new Error(json.error ?? 'Failed to save messages')
      }
      await updateSessionTimestamp(sessionId)
    },
    [updateSessionTimestamp],
  )

  const loadMessages = useCallback(async (
    sessionId: string,
    opts?: { limit?: number; before?: string },
  ): Promise<{ messages: PersistedMessage[]; hasMore: boolean }> => {
    // SDK-only sessions: load from ClaudeClaw endpoint
    if (sessionId.startsWith('sdk:')) {
      const sdkId = sessionId.slice(4)
      try {
        // TEMPORAL: leer el transcript del pool de la cuenta activa (bro → ~/.claude-bro).
        const res = await fetch(`/api/chat/sessions/${sdkId}/messages`)
        if (!res.ok) return { messages: [], hasMore: false }
        const { messages: rawMsgs } = await res.json() as {
          messages: Array<{
            type: string
            uuid?: string
            timestamp?: string
            message?: {
              role?: string
              // content llega como STRING (prompts del user, algunos assistant)
              // o como ARRAY de bloques (text/thinking/tool_use/tool_result).
              content?: string | Array<{ type: string; text?: string; thinking?: string }>
            }
          }>
        }

        // Limpieza de mensajes de USER: quita ruido inyectado que NO es
        // conversación real. Devuelve null si el mensaje era 100% ruido.
        //  · invocaciones de slash-command (/model, /effort) y sus outputs
        //  · bloques <system-reminder> que el harness anexa al prompt
        //  · el prefijo "[Context: ...]" que antepone el daemon
        const cleanUserText = (raw: string): string | null => {
          // Invocaciones de slash-command (/model, /effort) y sus outputs
          // locales: acciones de UI del CLI, no turnos de conversación.
          if (/^\s*<(command-name|command-message|local-command-stdout|local-command-stderr|local-command-caveat)>/.test(raw)) {
            return null
          }
          // Quita bloques que el harness INYECTA en el mensaje de user (no son
          // texto que el usuario escribió) + el prefijo de contexto del daemon.
          const cleaned = raw
            .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
            .replace(/<task-notification>[\s\S]*?<\/task-notification>/g, '')
            .replace(/^\[Context:[\s\S]*?\]\n\n/, '')
            .trim()
          return cleaned || null
        }

        // Reconstruye la conversación completa. thinking se antepone al SIGUIENTE
        // texto (no es burbuja aparte); tool_use/tool_result no aportan texto → se
        // omiten. BUG previo (7 jul): `if (!Array.isArray(content)) continue`
        // TIRABA todos los prompts del user (vienen como STRING) y colapsaba la
        // conversación a solo las respuestas con texto — se perdía casi todo el
        // contexto al abrir una conversación CLI desde la UI.
        const result: PersistedMessage[] = []
        let pendingThinking: string[] = []

        for (const m of rawMsgs) {
          const role = m.type === 'user' ? 'user' : m.type === 'assistant' ? 'assistant' : null
          if (!role) continue

          const content = m.message?.content

          if (Array.isArray(content)) {
            for (const b of content) {
              if (b.type === 'thinking' && b.thinking) {
                pendingThinking.push(`<!--thinking-->${b.thinking}<!--/thinking-->`)
              }
            }
          }

          // Texto visible: string plano o los bloques `text` de un array.
          let text = ''
          if (typeof content === 'string') {
            text = content
          } else if (Array.isArray(content)) {
            text = content.filter((b) => b.type === 'text' && b.text).map((b) => b.text!).join('\n\n')
          }

          if (role === 'user') {
            const cleaned = cleanUserText(text)
            if (cleaned === null) continue // ruido de CLI / reminder puro
            text = cleaned
          }
          if (!text.trim()) continue // tool_result puro, thinking puro, etc.

          const allParts = pendingThinking.length > 0 ? [...pendingThinking, text] : [text]
          pendingThinking = []

          result.push({
            id: m.uuid ?? `sdk-${result.length}`,
            session_id: sessionId,
            role,
            content: allParts.join('\n\n'),
            created_at: m.timestamp ?? new Date().toISOString(),
          })
        }

        // El endpoint entrega el transcript COMPLETO (sin cursor de paginación).
        // Recortamos a los últimos N para acotar el render inicial de una sesión
        // muy larga, pero N es GENEROSO (no el page-size chico de MC) para no
        // perder contexto: casi toda conversación CLI cabe entera. `before`/`limit`
        // no aplican aquí (no hay paginación por cursor en sesiones SDK).
        const SDK_RENDER_CAP = 200
        const sliced = result.length > SDK_RENDER_CAP ? result.slice(-SDK_RENDER_CAP) : result
        return { messages: sliced, hasMore: false }
      } catch { return { messages: [], hasMore: false } }
    }

    // MC sessions: load through the local/server auth layer (paginado por cursor).
    const params = new URLSearchParams({ source: 'mc' })
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.before) params.set('before', opts.before)
    const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}/messages?${params}`, { cache: 'no-store' })
    const json = await res.json().catch(() => ({})) as { messages?: PersistedMessage[]; hasMore?: boolean }
    if (!res.ok) return { messages: [], hasMore: false }
    return { messages: (json.messages as PersistedMessage[]) ?? [], hasMore: json.hasMore ?? false }
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    await fetch('/api/chat/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }, [])

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    await fetch('/api/chat/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, title: trimmed }),
    })
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, title: trimmed } : s))
  }, [])

  const toggleFavorite = useCallback(async (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId)
    if (!target) return
    const next = !target.is_favorite
    await fetch('/api/chat/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, is_favorite: next }),
    })
    setSessions((prev) =>
      prev
        .map((s) => (s.id === sessionId ? { ...s, is_favorite: next } : s))
        .sort(sessionSort),
    )
  }, [sessions])

  return {
    sessions,
    loading,
    loadSessions,
    createSession,
    saveMessages,
    loadMessages,
    deleteSession,
    renameSession,
    toggleFavorite,
  }
}
