'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { isOnline, queueChatPrompt } from '@/lib/local-first'
import { useModelStore } from '../stores/model-store'

export interface CompactMeta {
  tokensBefore?: number
  tokensAfter?: number
}

export interface ToolCall {
  toolId: string
  toolName: string
  status: 'running' | 'done'
}

export interface UsageMeta {
  costUsd: number
  inputTokens: number
  outputTokens: number
  durationMs: number
  numTurns: number
  contextUsed?: number
  contextTotal?: number
}

// El modelo que respondió el turno NO fue el que pediste. Caso típico: refusal
// fallback — Fable 5 declinó por seguridad y su hermano Opus 4.8 contestó.
// refusal=false ⇒ fue fallback de capacidad (529). category (si refusal) = la
// categoría del clasificador: cyber | bio | frontier_llm | reasoning_extraction.
export interface ModelDowngrade {
  from: string
  to: string
  refusal: boolean
  category?: string | null
}

export interface FileAttachmentMeta {
  url: string
  filename: string
  mimeType: string
  size?: number
}

export type TodoStatus = 'pending' | 'in_progress' | 'completed'
export interface TodoItem {
  content: string
  status: TodoStatus
  activeForm?: string
}

// Subagente/task en background (Agent tool, workflows/ultracode, shells).
// Ciclo: task_started → task_progress* → task_updated/task_notification.
export interface AgentTask {
  taskId: string
  description: string
  subagentType?: string
  taskType?: string
  workflowName?: string
  status: 'running' | 'completed' | 'failed' | 'stopped' | 'killed' | 'paused' | 'pending'
  totalTokens?: number
  toolUses?: number
  lastToolName?: string
  summary?: string
  error?: string
}

// ── AskUserQuestion interactivo: el agente pregunta con opciones, el usuario toca ──
export interface UserQuestionOption {
  label: string
  description?: string
}
export interface UserQuestion {
  question: string
  header?: string
  options: UserQuestionOption[]
  multiSelect?: boolean
}
export interface QuestionPrompt {
  requestId: string
  questions: UserQuestion[]
  status: 'pending' | 'answered' | 'skipped' | 'timeout'
  answers?: Record<string, string>
}

// Metadata persistida junto al mensaje en Supabase (jsonb). Los extras del
// turno (tasks, summaries, preguntas, usage, sugerencias) viajan aquí para que
// recargar la sesión reconstruya la conversación fiel — no solo el texto.
export interface MessageMetadata {
  source?: string
  jobId?: string
  jobLabel?: string
  // Identidad del turno (UUID generado por el cliente al enviar). Viaja en las
  // DOS filas del par user+assistant y en el webhook de ClaudeClaw. Un índice
  // único en BD sobre (metadata->>'turnId', role) garantiza CERO duplicados
  // sin importar quién gane la carrera de guardado (cliente vs server).
  turnId?: string
  fileAttachments?: FileAttachmentMeta[]
  tasks?: AgentTask[]
  toolSummaries?: string[]
  questionPrompts?: QuestionPrompt[]
  suggestions?: string[]
  usage?: UsageMeta
  downgrade?: ModelDowngrade
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  error?: boolean
  audioUrl?: string
  imageUrl?: string
  compact?: CompactMeta
  metadata?: MessageMetadata | null
  fileAttachments?: FileAttachmentMeta[]
  toolCalls?: ToolCall[]
  toolInputs?: Record<string, string>     // toolId → JSON parcial acumulado mientras el modelo emite el input
  todos?: TodoItem[]                       // lista activa de TODOs (el agente planeando por fases via TodoWrite)
  tasks?: AgentTask[]                      // subagentes/workflows en background (cards vivas tipo agent-view)
  toolSummaries?: string[]                 // resúmenes display-friendly de batches de tools (SDK 0.3.179+)
  questionPrompts?: QuestionPrompt[]       // preguntas interactivas (AskUserQuestion) del turno
  thinking?: string                        // bloque thinking acumulado durante streaming
  status?: string | null                   // 'requesting' | 'compacting' | etc — null cuando termina
  usage?: UsageMeta
  downgrade?: ModelDowngrade               // el modelo pedido ≠ el que respondió (ej. Fable→Opus por seguridad)
  streaming?: boolean
}

// SSE event types from ClaudeClaw
type SSEEvent =
  | { type: 'init'; sessionId: string; slashCommands?: string[] }
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_start' }
  | { type: 'thinking_delta'; text: string }
  | { type: 'thinking_stop' }
  | { type: 'tool_start'; toolName: string; toolId: string }
  | { type: 'tool_input_delta'; toolId: string; partial: string }
  | { type: 'tool_done'; toolId: string }
  | { type: 'todos_update'; todos: TodoItem[] }
  | { type: 'status'; status: string }
  | { type: 'compact'; tokensBefore?: number; tokensAfter?: number }
  | { type: 'usage'; costUsd: number; inputTokens: number; outputTokens: number; durationMs: number; numTurns: number; model?: string; contextUsed?: number; contextTotal?: number }
  | { type: 'result'; text: string; terminalReason?: string }
  | { type: 'file_attachment'; url: string; filename: string; mimeType: string }
  | { type: 'model_changed'; model: string | null; display?: string; resolved?: string | null }
  | { type: 'model_downgraded'; from: string; to: string; refusal?: boolean; category?: string | null }
  | { type: 'effort_changed'; effort: string | null }
  | { type: 'interrupt' }
  | { type: 'error'; message: string }
  | { type: 'task_started'; taskId: string; description: string; subagentType?: string; taskType?: string; workflowName?: string; toolUseId?: string }
  | { type: 'task_progress'; taskId: string; description: string; totalTokens?: number; toolUses?: number; durationMs?: number; lastToolName?: string; summary?: string }
  | { type: 'task_updated'; taskId: string; status?: string; description?: string; error?: string }
  | { type: 'task_notification'; taskId: string; status: 'completed' | 'failed' | 'stopped'; summary: string; totalTokens?: number; toolUses?: number }
  | { type: 'tool_summary'; summary: string; toolUseIds: string[] }
  | { type: 'suggestion'; suggestion: string }
  | { type: 'fast_changed'; enabled: boolean }
  | { type: 'ultracode_changed'; enabled: boolean }
  | { type: 'ask_user_question'; requestId: string; questions: UserQuestion[] }
  | { type: 'question_resolved'; requestId: string; outcome: 'answered' | 'skipped' | 'timeout' }
  // Primer evento de /api/chat/live: meta del turno en vuelo (resume).
  | { type: 'resume_meta'; turnId: string | null; userMessage: string; audioUrl?: string | null; imageUrl?: string | null; startedAt?: number }

// Extras del turno que el caller persiste junto al mensaje del assistant.
export interface TurnExtras {
  turnId?: string
  audioUrl?: string
  imageUrl?: string
  assistantAudioUrl?: string
  fileAttachments?: FileAttachmentMeta[]
  tasks?: AgentTask[]
  toolSummaries?: string[]
  questionPrompts?: QuestionPrompt[]
  suggestions?: string[]
  usage?: UsageMeta
  downgrade?: ModelDowngrade
}

interface UseChatOptions {
  sessionId?: string | null
  onSave?: (userMsg: string, assistantMsg: string, extras: TurnExtras) => Promise<void>
  // Callback invocado cuando ESC durante streaming hace rollback del turno: devuelve el texto
  // exacto que el user habia escrito al input bar (paridad con Claude Code CLI). Si no se pasa,
  // el rollback ocurre pero el textarea NO se restaura (caller responsable de su propio input).
  onRestoreInput?: (text: string) => void
  // Guard del resume: el caller (ChatPanel) confirma que la sesión sigue siendo
  // la ACTIVA antes de que resumeStream mute el estado visible. Sin esto, un
  // auto-resume tras un drop de red podría inyectar el turno de una sesión
  // vieja en la vista de otra.
  isSessionActive?: (sessionId: string) => boolean
}

export function useChat({ sessionId, onSave, onRestoreInput, isSessionActive }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // Espejo síncrono de messages para decisiones fuera del ciclo de render (ej.
  // dedup del sello de downgrade: "¿ya avisamos en esta conversación?"). Los
  // turnos previos ya están commiteados aquí; el efecto sincroniza tras cada render.
  const messagesRef = useRef<ChatMessage[]>([])
  useEffect(() => { messagesRef.current = messages }, [messages])
  const [loading, setLoadingState] = useState(false)
  // loading TAMBIÉN en ref: los guards de resumeStream corren desde closures
  // viejos (setTimeout post-turno, listeners de foreground) donde el state
  // capturado puede estar stale — el ref siempre dice la verdad.
  const loadingRef = useRef(false)
  const setLoading = useCallback((v: boolean) => {
    loadingRef.current = v
    setLoadingState(v)
  }, [])
  const [currentModel, setCurrentModelState] = useState<string | null>(null)
  const [currentEffort, setCurrentEffort] = useState<string | null>(null)

  // El modelo activo vive TAMBIÉN en el store compartido (header móvil/desktop).
  // Solo valores concretos propagan al store — un null local (reset a default
  // sin resolver aún) no borra la última verdad conocida de otras superficies.
  // Se normaliza el sufijo de contexto del SDK ('claude-opus-4-8[1m]' → base)
  // para que el no-op check del picker y el match del checkmark comparen igual.
  const setCurrentModel = useCallback((model: string | null) => {
    const base = model ? model.replace(/\[[^\]]+\]$/, '') : null
    setCurrentModelState(base)
    if (base) useModelStore.getState().setModel(base)
  }, [])

  // Fetch de la verdad al montar (una vez, post-paint, no bloquea nada): el
  // header muestra el modelo real aunque nadie haya cambiado nada esta sesión.
  useEffect(() => {
    const cached = useModelStore.getState().model
    if (cached) { setCurrentModelState(cached); return }
    let cancelled = false
    fetch('/api/chat/model')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.model) setCurrentModel(d.model) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Follow-up suggestions del último turno (promptSuggestions del SDK).
  // Se limpian al enviar el siguiente mensaje o al cambiar de sesión.
  const [suggestions, setSuggestions] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const intentionalStopRef = useRef(false)
  // Track which session the current stream belongs to — when user switches
  // sessions, we detach the stream (let it continue in background) and free the UI
  const streamSessionRef = useRef<string | null>(null)
  // Snapshot del turno en vuelo para rollback con ESC: capturamos rawText sincronicamente
  // en sendMessage (NO depender de `messages` state que es asincronico por React batching).
  const pendingTurnRef = useRef<{ userId: string; assistantId: string; rawText: string } | null>(null)
  // Overrides de estado de preguntas interactivas respondidas por answerQuestion.
  // El stream loop tiene su copia local (closure) de questionPrompts — sin este
  // ref, el evento `result` pisaría el estado 'answered' con el 'pending' viejo.
  const questionStatusRef = useRef<Map<string, { status: QuestionPrompt['status']; answers?: Record<string, string> }>>(new Map())

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Detach stream when user switches to a different session.
  // ClaudeClaw keeps processing in background and saves via /api/chat/complete.
  const detachStream = useCallback(() => {
    if (!loading) return
    intentionalStopRef.current = false // not intentional stop, it's a session switch
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false) // free the UI immediately so user can send in new session
  }, [loading])

  // Rollback total tipo Claude Code CLI: ESC durante streaming →
  //   1. Restaura el texto del user al input (via callback)
  //   2. Remueve userMsg + assistantMsg de la lista (como si nunca hubieras enviado)
  //   3. Interrumpe ClaudeClaw gracefully (con sessionId si lo tenemos)
  //   4. Aborta el fetch SSE local como fallback
  // El catch del SSE loop NO persiste nada cuando intentionalStopRef=true (ver mas abajo).
  const stopStreaming = useCallback(async () => {
    intentionalStopRef.current = true

    const turn = pendingTurnRef.current
    if (turn) {
      // Restaurar texto al input ANTES de remover el mensaje (mejor UX: cursor focus inmediato)
      onRestoreInput?.(turn.rawText)
      // Rollback: filtrar ambos por ID (user msg + assistant placeholder vacio)
      setMessages((prev) => prev.filter((m) => m.id !== turn.userId && m.id !== turn.assistantId))
    }

    // Interrupt graceful upstream: pasamos sessionId para que ClaudeClaw aborte
    // SOLO esa sesion (no toca otras tabs/sesiones en vuelo). Si aún no hay
    // sessionId (la creación en background no resolvía cuando llegó el ESC),
    // NO mandamos interrupt: el fetch ni siquiera salió — abortar local basta
    // (y el modo legacy sin id abortaría TODAS las sesiones, incluidos crons).
    if (streamSessionRef.current) {
      fetch('/api/chat/interrupt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: streamSessionRef.current }),
      }).catch(() => {})
    }

    // Fallback: abortar fetch SSE local (network-level)
    abortRef.current?.abort()
  }, [onRestoreInput])

  // ── Núcleo compartido de consumo SSE ──
  // Lo usan sendMessage (stream nuevo) y resumeStream (reenganche a un turno
  // en vuelo via /api/chat/live). Procesa TODOS los eventos con flush batched
  // por rAF, finaliza el mensaje, y persiste+ACK SOLO si llegó `result`: un
  // stream que muere a la mitad JAMÁS guarda el parcial — el server es el
  // dueño del turno y persiste la versión completa (bug 7 jul: el cliente
  // guardaba+ackeaba el parcial y el dedupe por turnId descartaba la completa).
  const consumeStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    ctx: {
      assistantId: string
      turnId: string | null
      userText: string
      audioUrl?: string
      imageUrl?: string
      // Solo en resume: el primer evento del replay trae la meta del turno.
      onResumeMeta?: (meta: Extract<SSEEvent, { type: 'resume_meta' }>) => void
    },
  ): Promise<{ sawResult: boolean; sawError: boolean }> => {
    const { assistantId } = ctx
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulatedText = ''
    let accumulatedThinking = ''
    let thinkingVisible = false
    const toolInputs: Record<string, string> = {}
    let latestTodos: TodoItem[] | undefined
    let compactMeta: CompactMeta | undefined
    let usageMeta: UsageMeta | undefined
    let downgradeMeta: ModelDowngrade | undefined
    let toolCalls: ToolCall[] = []
    let agentTasks: AgentTask[] = []
    let toolSummaries: string[] = []
    let questionPrompts: QuestionPrompt[] = []
    let turnSuggestions: string[] = []
    let assistantAudioUrl: string | undefined
    let fileAttachments: FileAttachmentMeta[] = []
    let sawResult = false
    let sawError = false

    // Merge del estado local de preguntas con las respuestas registradas por
    // answerQuestion (ver questionStatusRef arriba).
    const withQuestionOverrides = (prompts: QuestionPrompt[]): QuestionPrompt[] =>
      prompts.map((q) => {
        const o = questionStatusRef.current.get(q.requestId)
        return o ? { ...q, status: o.status, ...(o.answers ? { answers: o.answers } : {}) } : q
      })
    let pendingFlush = false
    let rafId = 0

    const flushText = () => {
      pendingFlush = false
      const text = accumulatedText
      const thinking = thinkingVisible ? accumulatedThinking : undefined
      const inputs = Object.keys(toolInputs).length ? { ...toolInputs } : undefined
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: text, thinking, toolInputs: inputs } : m
        )
      )
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue

        let event: SSEEvent
        try {
          event = JSON.parse(data) as SSEEvent
        } catch {
          continue
        }

        switch (event.type) {
          case 'resume_meta':
            ctx.onResumeMeta?.(event)
            break

          case 'text_delta':
            accumulatedText += event.text
            if (!pendingFlush) {
              pendingFlush = true
              rafId = requestAnimationFrame(flushText)
            }
            break

          case 'thinking_start':
            thinkingVisible = true
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, thinking: m.thinking ?? '' } : m)),
            )
            break

          case 'thinking_delta':
            thinkingVisible = true
            accumulatedThinking += event.text
            if (!pendingFlush) {
              pendingFlush = true
              rafId = requestAnimationFrame(flushText)
            }
            break

          case 'thinking_stop':
            break

          case 'tool_start':
            toolCalls = [...toolCalls, { toolId: event.toolId, toolName: event.toolName, status: 'running' }]
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m
              )
            )
            break

          case 'tool_input_delta':
            toolInputs[event.toolId] = (toolInputs[event.toolId] ?? '') + event.partial
            if (!pendingFlush) {
              pendingFlush = true
              rafId = requestAnimationFrame(flushText)
            }
            break

          case 'tool_done':
            toolCalls = toolCalls.map((t) =>
              t.toolId === event.toolId ? { ...t, status: 'done' as const } : t
            )
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m
              )
            )
            break

          case 'todos_update':
            latestTodos = event.todos
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, todos: event.todos } : m
              )
            )
            break

          case 'task_started':
            agentTasks = [
              ...agentTasks.filter((t) => t.taskId !== event.taskId),
              {
                taskId: event.taskId,
                description: event.description,
                subagentType: event.subagentType,
                taskType: event.taskType,
                workflowName: event.workflowName,
                status: 'running',
              },
            ]
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, tasks: [...agentTasks] } : m))
            )
            break

          case 'task_progress':
            agentTasks = agentTasks.map((t) =>
              t.taskId === event.taskId
                ? {
                    ...t,
                    description: event.description || t.description,
                    totalTokens: event.totalTokens ?? t.totalTokens,
                    toolUses: event.toolUses ?? t.toolUses,
                    lastToolName: event.lastToolName ?? t.lastToolName,
                    summary: event.summary ?? t.summary,
                  }
                : t
            )
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, tasks: [...agentTasks] } : m))
            )
            break

          case 'task_updated':
            agentTasks = agentTasks.map((t) =>
              t.taskId === event.taskId
                ? {
                    ...t,
                    ...(event.status && { status: event.status as AgentTask['status'] }),
                    ...(event.description && { description: event.description }),
                    ...(event.error && { error: event.error }),
                  }
                : t
            )
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, tasks: [...agentTasks] } : m))
            )
            break

          case 'task_notification':
            agentTasks = agentTasks.map((t) =>
              t.taskId === event.taskId
                ? {
                    ...t,
                    status: event.status,
                    summary: event.summary || t.summary,
                    totalTokens: event.totalTokens ?? t.totalTokens,
                    toolUses: event.toolUses ?? t.toolUses,
                  }
                : t
            )
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, tasks: [...agentTasks] } : m))
            )
            break

          case 'tool_summary':
            if (event.summary) {
              toolSummaries = [...toolSummaries, event.summary]
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, toolSummaries: [...toolSummaries] } : m))
              )
            }
            break

          case 'suggestion':
            if (!turnSuggestions.includes(event.suggestion)) turnSuggestions = [...turnSuggestions, event.suggestion]
            setSuggestions((prev) =>
              prev.includes(event.suggestion) ? prev : [...prev, event.suggestion]
            )
            break

          case 'ask_user_question':
            questionPrompts = [
              ...questionPrompts.filter((q) => q.requestId !== event.requestId),
              { requestId: event.requestId, questions: Array.isArray(event.questions) ? event.questions : [], status: 'pending' },
            ]
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, questionPrompts: withQuestionOverrides(questionPrompts) } : m))
            )
            break

          case 'question_resolved':
            if (!questionStatusRef.current.has(event.requestId)) {
              questionStatusRef.current.set(event.requestId, {
                status: event.outcome === 'answered' ? 'answered' : event.outcome === 'skipped' ? 'skipped' : 'timeout',
              })
            }
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, questionPrompts: withQuestionOverrides(questionPrompts) } : m))
            )
            break

          case 'status':
            if (event.status === 'requesting' && !thinkingVisible) {
              thinkingVisible = true
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, status: event.status, thinking: '' } : m,
                ),
              )
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, status: event.status } : m)),
              )
            }
            break

          case 'compact':
            compactMeta = { tokensBefore: event.tokensBefore, tokensAfter: event.tokensAfter }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, compact: compactMeta } : m
              )
            )
            break

          case 'usage':
            usageMeta = {
              costUsd: event.costUsd,
              inputTokens: event.inputTokens,
              outputTokens: event.outputTokens,
              durationMs: event.durationMs,
              numTurns: event.numTurns,
              contextUsed: event.contextUsed,
              contextTotal: event.contextTotal,
            }
            if (event.model) setCurrentModel(event.model)
            break

          case 'file_attachment': {
            const attachment: FileAttachmentMeta = { url: event.url, filename: event.filename, mimeType: event.mimeType }
            fileAttachments = [...fileAttachments, attachment]
            const isAudio = event.mimeType.startsWith('audio/')
            if (isAudio) assistantAudioUrl = event.url
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, ...(isAudio ? { audioUrl: event.url } : {}), fileAttachments: [...fileAttachments] }
                  : m
              )
            )
            break
          }

          case 'result': {
            sawResult = true
            cancelAnimationFrame(rafId)
            pendingFlush = false
            const finalText = (event.text || accumulatedText).trim()
            accumulatedText = finalText
            const finalThinking =
              thinkingVisible && accumulatedThinking ? accumulatedThinking : undefined
            const finalInputs = Object.keys(toolInputs).length ? { ...toolInputs } : undefined
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: finalText,
                      streaming: false,
                      usage: usageMeta,
                      downgrade: downgradeMeta,
                      compact: compactMeta,
                      toolCalls: [...toolCalls],
                      thinking: finalThinking,
                      toolInputs: finalInputs,
                      todos: latestTodos,
                      tasks: agentTasks.length ? [...agentTasks] : undefined,
                      toolSummaries: toolSummaries.length ? [...toolSummaries] : undefined,
                      questionPrompts: questionPrompts.length ? withQuestionOverrides(questionPrompts) : undefined,
                      status: null,
                    }
                  : m
              )
            )
            break
          }

          case 'model_changed':
            setCurrentModel(event.model ?? event.resolved ?? null)
            break

          case 'model_downgraded': {
            // El modelo pedido no fue el que respondió (Fable declinó por
            // seguridad → Opus contestó). refusal viene true del daemon (no hay
            // fallback de capacidad configurado); default true por robustez.
            const incoming: ModelDowngrade = {
              from: event.from,
              to: event.to,
              refusal: event.refusal ?? true,
              category: event.category ?? null,
            }
            // SOLO el primer downgrade de la conversación lleva sello: tras el
            // reroute la convo queda pegada a Opus y el daemon lo re-emite cada
            // turno, pero avisar una vez basta. messagesRef =
            // fuente síncrona fiable (los turnos previos ya están commiteados), así
            // que la decisión y el downgradeMeta a persistir se fijan aquí mismo.
            const already = messagesRef.current.some(
              (m) => m.role === 'assistant' && m.id !== assistantId && m.downgrade?.to === incoming.to,
            )
            if (!already) {
              downgradeMeta = incoming
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, downgrade: incoming } : m)),
              )
            }
            break
          }

          case 'effort_changed':
            setCurrentEffort(event.effort)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: event.effort
                        ? `Esfuerzo cambiado a **${event.effort}**`
                        : 'Esfuerzo reseteado al **default** del modelo',
                      streaming: false,
                    }
                  : m
              )
            )
            break

          case 'error':
            sawError = true
            cancelAnimationFrame(rafId)
            pendingFlush = false
            pendingTurnRef.current = null
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: event.message || 'Error del agente', error: true, streaming: false }
                  : m
              )
            )
            break
        }
      }
    }

    // Flush any pending text before marking stream done
    cancelAnimationFrame(rafId)
    if (pendingFlush) flushText()

    // Mark streaming done (in case we didn't get a result event)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.streaming
          ? { ...m, streaming: false, usage: usageMeta }
          : m
      )
    )

    // Persistir + ACK — SOLO con turno completo (result). Sin result no se
    // guarda nada: el server persiste la versión completa y el cliente la
    // reconcilia (o se reengancha al vivo).
    if (sawResult && accumulatedText.trim() && onSave) {
      const finalPrompts = withQuestionOverrides(questionPrompts)
        .map((q) => (q.status === 'pending' ? { ...q, status: 'timeout' as const } : q))
      const ackTurnId = ctx.turnId
      onSave(ctx.userText, accumulatedText.trim(), {
        turnId: ackTurnId ?? undefined,
        audioUrl: ctx.audioUrl,
        imageUrl: ctx.imageUrl,
        assistantAudioUrl,
        fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        tasks: agentTasks.length > 0 ? agentTasks : undefined,
        toolSummaries: toolSummaries.length > 0 ? toolSummaries : undefined,
        questionPrompts: finalPrompts.length > 0 ? finalPrompts : undefined,
        suggestions: turnSuggestions.length > 0 ? turnSuggestions : undefined,
        usage: usageMeta,
        downgrade: downgradeMeta,
      }).then(() => {
        // ACK post-guardado: "este turno YA está guardado y lo estoy viendo" →
        // el daemon no re-guarda ni manda push. Fire-and-forget: si se pierde,
        // el índice único absorbe el doble guardado y el push extra es inocuo.
        if (!ackTurnId) return
        fetch('/api/chat/ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnId: ackTurnId }),
        }).catch(() => { /* daemon decide solo por timeout */ })
      }).catch((e) => {
        console.error('[useChat] Failed to persist:', e)
      })
    }

    return { sawResult, sawError }
  }, [onSave, setCurrentModel])

  // ── Resume de un turno EN VUELO (estilo Anthropic) ──
  // Reabrir la app / volver a la sesión a mitad del streaming: pega a
  // /api/chat/live; si el daemon tiene el turno vivo, replay del buffer +
  // tail en vivo con el MISMO pipeline del stream normal. Si no hay turno
  // vivo devuelve false y el caller reconcilia desde la BD/transcript.
  const resumingRef = useRef(false)
  const resumeStream = useCallback(async (targetSessionId: string): Promise<boolean> => {
    if (!targetSessionId) return false
    if (loadingRef.current) return false // ya hay un stream vivo en esta UI
    if (resumingRef.current) return false // reenganche en progreso (multi-unlock)
    if (isSessionActive && !isSessionActive(targetSessionId)) return false
    resumingRef.current = true
    const ac = new AbortController()
    let attached = false
    try {
      const res = await fetch('/api/chat/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatSessionId: targetSessionId }),
        signal: ac.signal,
      })
      const contentType = res.headers.get('Content-Type') ?? ''
      if (!res.ok || !res.body || !contentType.includes('text/event-stream')) {
        return false // {live:false} — nada que reenganchar
      }
      // Doble-check post-fetch: la sesión pudo cambiar mientras esperábamos.
      if (loadingRef.current || (isSessionActive && !isSessionActive(targetSessionId))) {
        ac.abort()
        return false
      }

      const now = Date.now()
      const userId = `u-${now}`
      const assistantId = `a-${now}`
      const ctx: {
        assistantId: string
        turnId: string | null
        userText: string
        audioUrl?: string
        imageUrl?: string
        onResumeMeta?: (meta: Extract<SSEEvent, { type: 'resume_meta' }>) => void
      } = {
        assistantId,
        turnId: null,
        userText: '',
        onResumeMeta: (meta) => {
          attached = true
          ctx.turnId = meta.turnId ?? null
          ctx.userText = meta.userMessage
          ctx.audioUrl = meta.audioUrl ?? undefined
          ctx.imageUrl = meta.imageUrl ?? undefined
          intentionalStopRef.current = false
          abortRef.current = ac
          streamSessionRef.current = targetSessionId
          questionStatusRef.current.clear()
          pendingTurnRef.current = { userId, assistantId, rawText: meta.userMessage }
          setLoading(true)
          setSuggestions([])
          setMessages((prev) => {
            // Quitar el turno parcial congelado (ids temporales) que el view
            // cache pudo restaurar — el replay lo reconstruye COMPLETO.
            const cleaned = [...prev]
            while (cleaned.length > 0) {
              const last = cleaned[cleaned.length - 1]
              const staleAssistant = last.role === 'assistant' && last.id.startsWith('a-')
              const staleUser = last.role === 'user' && last.id.startsWith('u-') && last.content === meta.userMessage
              if (staleAssistant || staleUser) {
                cleaned.pop()
                continue
              }
              break
            }
            return [
              ...cleaned,
              {
                id: userId,
                role: 'user' as const,
                content: meta.userMessage,
                timestamp: new Date(),
                audioUrl: meta.audioUrl ?? undefined,
                imageUrl: meta.imageUrl ?? undefined,
              },
              {
                id: assistantId,
                role: 'assistant' as const,
                content: '',
                timestamp: new Date(),
                streaming: true,
                toolCalls: [],
              },
            ]
          })
        },
      }

      const reader = res.body.getReader()
      await consumeStream(reader, ctx)
      return attached
    } catch {
      // Abort o red caída durante el reenganche: dejar el placeholder como
      // done; el próximo foreground/reconcile lo levanta desde la BD.
      if (attached) {
        setMessages((prev) =>
          prev.map((m) => (m.role === 'assistant' && m.streaming ? { ...m, streaming: false } : m))
        )
      }
      return attached
    } finally {
      resumingRef.current = false
      if (abortRef.current === ac) abortRef.current = null
      if (attached) {
        setLoading(false)
        pendingTurnRef.current = null
      }
    }
  }, [isSessionActive, consumeStream, setLoading])

  const sendMessage = useCallback(async (text: string, opts?: { audioUrl?: string; imageUrl?: string; effort?: string; chatSessionId?: string; sessionPromise?: Promise<{ id: string; sdkSessionId?: string | null } | null>; sdkSessionId?: string; context?: string }) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    intentionalStopRef.current = false

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      audioUrl: opts?.audioUrl,
      imageUrl: opts?.imageUrl,
    }
    const assistantId = `a-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
      toolCalls: [],
    }

    // Snapshot sincrono del turno para rollback con ESC. El rawText es exactamente lo que el user
    // escribio (post-trim) — si presionan ESC, este es el texto que vuelve al input.
    pendingTurnRef.current = { userId: userMsg.id, assistantId, rawText: trimmed }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setSuggestions([])
    setLoading(true)
    // Si la sesión viene en promise (creación en background), streamSessionRef
    // se fija más abajo cuando resuelva — antes del fetch, siempre.
    streamSessionRef.current = opts?.chatSessionId ?? null
    questionStatusRef.current.clear()

    if (!isOnline()) {
      try {
        await queueChatPrompt({
          prompt: trimmed,
          route: typeof window !== 'undefined' ? window.location.pathname : '/chat',
          contextPackId: null,
          localContext: opts?.context ? { context: opts.context } : undefined,
        })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'Mensaje guardado localmente. Se enviará cuando vuelva la conexión.',
                  streaming: false,
                  status: null,
                }
              : m
          )
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'No se pudo guardar el mensaje localmente.', error: true, streaming: false }
              : m
          )
        )
      } finally {
        setLoading(false)
        pendingTurnRef.current = null
      }
      return
    }

    abortRef.current = new AbortController()

    // La sesión pudo venir como PROMISE (creación en background para que el
    // paint del turno sea instantáneo). Se resuelve AQUÍ, antes del fetch —
    // el invariante se mantiene: el stream SIEMPRE sale con chatSessionId
    // (sin id, ClaudeClaw caería a la sesión global 'mc-web').
    let chatSessionId = opts?.chatSessionId ?? null
    if (!chatSessionId && opts?.sessionPromise) {
      const session = await opts.sessionPromise
      // ESC durante la creación: stopStreaming ya hizo rollback — salir sin ruido.
      // (el fetch nunca salió, así que su catch no corre: liberar loading aquí)
      if (abortRef.current?.signal.aborted || intentionalStopRef.current) {
        setLoading(false)
        pendingTurnRef.current = null
        return
      }
      if (!session) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'No se pudo crear la sesión. Intenta de nuevo.', error: true, streaming: false }
              : m
          )
        )
        setLoading(false)
        pendingTurnRef.current = null
        return
      }
      chatSessionId = session.id
      streamSessionRef.current = session.id
    }

    // Detect device type so the backend only pushes notifications for mobile
    // clients that disconnect (app closed/backgrounded). Desktop never gets a
    // phone push, even if the browser tab dies.
    const source = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
      ? 'mobile'
      : 'desktop'

    // Identidad del turno: viaja al daemon (que la ecoa en su webhook de
    // completion) y se estampa en metadata de ambas filas al persistir. El ACK
    // post-guardado usa este id — es la base de "entrega garantizada": el server
    // asume desconexión SIEMPRE y solo se abstiene de guardar/pushear si el
    // cliente confirmó (ACK) que ya guardó el turno.
    const turnId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    // Reenganche: el stream terminó SIN result (cierre "limpio" del proxy a
    // mitad del turno — iOS/Vercel/ngrok lo hacen sin error) o se cayó la red.
    // El turno sigue vivo en el daemon: NO persistimos el parcial y nos
    // re-enganchamos al vivo via /api/chat/live.
    let shouldAttemptResume = false

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          source,
          turnId,
          // TEMPORAL (2026-07-08): cuenta que factura el turno. La pasa la
          // superficie (ChatPanel), NUNCA un global, para no filtrar 'bro'
          // fuera de /chat. 'bro' → Max del hermano vía CLAUDE_CONFIG_DIR en
          // el daemon.
          ...(opts?.effort && { effort: opts.effort }),
          ...(chatSessionId && { chatSessionId }),
          ...(opts?.sdkSessionId && { sdkSessionId: opts.sdkSessionId }),
          ...(opts?.audioUrl && { audioUrl: opts.audioUrl }),
          ...(opts?.imageUrl && { imageUrl: opts.imageUrl }),
          ...(opts?.context && { context: opts.context }),
        }),
        signal: abortRef.current.signal,
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.error || 'Error de conexion', error: true, streaming: false }
              : m
          )
        )
        return
      }

      // Consumo compartido con resumeStream: procesa eventos, finaliza el
      // mensaje y persiste+ACK SOLO si llegó `result`.
      const reader = res.body.getReader()
      const { sawResult, sawError } = await consumeStream(reader, {
        assistantId,
        turnId,
        userText: trimmed,
        audioUrl: opts?.audioUrl,
        imageUrl: opts?.imageUrl,
      })
      if (!sawResult && !sawError && !intentionalStopRef.current) {
        shouldAttemptResume = true
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      // Network errors (screen lock, app backgrounded, WiFi drop) are NOT user errors —
      // ClaudeClaw continues processing in background and saves via /api/chat/complete.
      const isNetworkDrop = err instanceof TypeError && /network|fetch|failed/i.test(err.message)

      if (isAbort || isNetworkDrop) {
        if (intentionalStopRef.current) {
          // ESC intencional: rollback ya ejecutado por stopStreaming() (msgs ya removidos
          // del state, input restaurado). NO persistir nada — paridad Claude Code.
          intentionalStopRef.current = false
          pendingTurnRef.current = null
          return
        }
        // Drop no intencional: placeholder marcado como done. Si fue RED (no
        // un abort deliberado de detach/ESC), intentar reengancharse al vivo.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.streaming ? { ...m, streaming: false } : m
          )
        )
        if (isNetworkDrop) shouldAttemptResume = true
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'La conexion se interrumpio. Envia el mensaje de nuevo.', error: true, streaming: false }
              : m
          )
        )
      }
    } finally {
      setLoading(false)
      abortRef.current = null
      // Happy path / error path / network drop: limpiar el snapshot del turno.
      // (El branch de ESC intencional ya lo limpio antes en el catch).
      pendingTurnRef.current = null
    }

    // Reenganche fuera del try (el finally ya liberó loading). Delay corto:
    // que la red del dispositivo despierte de verdad antes de pegar al live.
    if (shouldAttemptResume) {
      const sid = streamSessionRef.current
      if (sid) {
        setTimeout(() => { void resumeStream(sid) }, 600)
      }
    }
  }, [loading, onSave, setLoading, consumeStream, resumeStream])

  // Reconstruye un ChatMessage desde la fila persistida, incluyendo los extras
  // del turno guardados en metadata (tasks, summaries, preguntas, usage).
  const fromPersisted = (m: { id: string; role: 'user' | 'assistant'; content: string; created_at: string; audio_url?: string | null; image_url?: string | null; metadata?: MessageMetadata | null }): ChatMessage => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at),
    audioUrl: m.audio_url ?? undefined,
    imageUrl: m.image_url ?? undefined,
    metadata: m.metadata ?? undefined,
    fileAttachments: m.metadata?.fileAttachments ?? undefined,
    tasks: m.metadata?.tasks ?? undefined,
    toolSummaries: m.metadata?.toolSummaries ?? undefined,
    questionPrompts: m.metadata?.questionPrompts ?? undefined,
    usage: m.metadata?.usage ?? undefined,
    downgrade: m.metadata?.downgrade ?? undefined,
  })

  const loadMessages = useCallback((
    persisted: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string; audio_url?: string | null; image_url?: string | null; metadata?: MessageMetadata | null }>,
  ) => {
    setMessages(persisted.map(fromPersisted))
    // Restaurar las sugerencias del último turno guardado — al reabrir la
    // sesión los chips reaparecen como en Claude (antes eran efímeras).
    const last = persisted[persisted.length - 1]
    setSuggestions(last?.role === 'assistant' && last.metadata?.suggestions?.length ? last.metadata.suggestions : [])
  }, [])

  // loadMessages reemplaza el estado al cambiar de sesión — las sugerencias del
  // turno anterior ya no aplican a la nueva vista.
  // Prepend de historial viejo (paginación hacia atrás). Dedup por id por si
  // el cursor trae un mensaje que ya está en pantalla.
  const prependMessages = useCallback((
    persisted: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string; audio_url?: string | null; image_url?: string | null; metadata?: MessageMetadata | null }>,
  ) => {
    setMessages((prev) => {
      const existing = new Set(prev.map((m) => m.id))
      const older = persisted.filter((m) => !existing.has(m.id)).map(fromPersisted)
      return older.length ? [...older, ...prev] : prev
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setSuggestions([])
  }, [])

  // Restaura un view completo desde el caché en memoria (chat-view-cache):
  // los ChatMessage van tal cual (ya deserializados, con toolCalls/thinking/
  // usage/tasks vivos — más rico que re-mapear desde Supabase). Percepción de
  // latencia cero al volver a /chat; la verdad del server se reconcilia después.
  const restoreMessages = useCallback((msgs: ChatMessage[], restoredSuggestions?: string[]) => {
    setMessages(msgs)
    setSuggestions(restoredSuggestions ?? [])
  }, [])

  // Responde (o salta, con answers=null) una pregunta interactiva del agente.
  // Optimistic UI primero — el POST resuelve la promesa de canUseTool en el
  // daemon y el mismo stream SSE que está abierto continúa con la respuesta.
  const answerQuestion = useCallback(async (requestId: string, answers: Record<string, string> | null): Promise<boolean> => {
    const status: QuestionPrompt['status'] = answers && Object.keys(answers).length > 0 ? 'answered' : 'skipped'
    questionStatusRef.current.set(requestId, { status, ...(answers ? { answers } : {}) })
    const patch = (to: QuestionPrompt['status'], withAnswers: boolean) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.questionPrompts?.some((q) => q.requestId === requestId)
            ? {
                ...m,
                questionPrompts: m.questionPrompts.map((q) =>
                  q.requestId === requestId
                    ? { ...q, status: to, ...(withAnswers && answers ? { answers } : {}) }
                    : q,
                ),
              }
            : m,
        ),
      )
    }
    patch(status, true)
    try {
      const res = await fetch('/api/chat/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, ...(answers ? { answers } : {}) }),
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as { ok?: boolean }
      if (!data.ok) {
        // La pregunta ya no está pendiente en el daemon (expiró/interrumpida)
        questionStatusRef.current.set(requestId, { status: 'timeout' })
        patch('timeout', false)
        return false
      }
      return true
    } catch {
      questionStatusRef.current.set(requestId, { status: 'timeout' })
      patch('timeout', false)
      return false
    }
  }, [])

  // Remueve mensajes por id del state local. Usado por ESC ESC (rewind del ultimo turn) en
  // ChatPanel para borrar user msg + assistant msg sin exponer setMessages directamente.
  const removeMessages = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setMessages((prev) => prev.filter((m) => !idSet.has(m.id)))
  }, [])

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      // Deduplicate by ID (exact match)
      if (prev.some((m) => m.id === msg.id)) {
        return prev
      }

      // If a real assistant message is arriving (from realtime/db), any local empty
      // streaming placeholder is now stale (the SSE conn died but server completed
      // and saved the response). Drop the placeholder so we don't show a ghost.
      let working = prev
      if (msg.role === 'assistant' && msg.content.trim()) {
        working = prev.filter(
          (m) => !(m.streaming && m.role === 'assistant' && !m.content.trim()),
        )
      }

      // Deduplicate by role + content (handles temp ID vs Supabase UUID mismatch)
      // When SSE stream creates a message with id "a-123" and Supabase saves it with a UUID,
      // the realtime subscription fires with the UUID — this check catches that duplicate.
      // Use .trim() because local state may have trailing whitespace while Supabase stores trimmed content.
      const existingIdx = working.findIndex((m) =>
        m.role === msg.role &&
        m.content.trim() === msg.content.trim()
      )

      if (existingIdx !== -1) {
        // MERGE: If a matching message exists, merge Supabase fields (imageUrl, audioUrl, metadata)
        // into the local message. This handles the case where realtime returns message with image_url
        // that wasn't in the local temp message yet.
        const existing = working[existingIdx]
        const merged = {
          ...existing,
          // Update ID to Supabase ID if not already a Supabase ID
          id: existing.id.startsWith('u-') || existing.id.startsWith('a-') ? msg.id : existing.id,
          // Merge attachments from realtime (prefer local if exists)
          audioUrl: existing.audioUrl ?? msg.audioUrl,
          imageUrl: existing.imageUrl ?? msg.imageUrl,
          // Update metadata if coming from Supabase
          metadata: existing.metadata ?? msg.metadata,
        }
        return working.map((m, i) => i === existingIdx ? merged : m)
      }

      return [...working, msg]
    })
  }, [])

  return { messages, loading, sendMessage, resumeStream, loadMessages, prependMessages, clearMessages, restoreMessages, appendMessage, stopStreaming, detachStream, currentModel, currentEffort, setCurrentEffort, removeMessages, suggestions, answerQuestion }
}
