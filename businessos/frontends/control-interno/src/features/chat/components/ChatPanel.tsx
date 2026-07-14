'use client'
import { useEffect, useLayoutEffect, useRef, useState, KeyboardEvent, useCallback, memo, startTransition, useMemo, type ReactNode } from 'react'
import { Plus, ArrowUp, AlertCircle, MessageSquare, Copy, Check, Clock, ChevronDown, ImageIcon, X, FileText, FileCode, Download, File, Wrench, BookOpen, ShieldAlert, Bot as BotIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { AGENT_NAME } from '@/shared/agent-identity'
import { useAuth } from '@/hooks/useAuth'
import { useChat, ChatMessage, ToolCall, FileAttachmentMeta, TurnExtras } from '../hooks/useChat'
import { useChatHistory, ChatSession, PersistedMessage } from '../hooks/useChatHistory'
import { cacheSnapshot, getCachedSnapshot } from '@/lib/local-first'
import { saveChatView, getChatView, clearChatView } from '../stores/chat-view-cache'
import { ChatSessions } from './ChatSessions'
import dynamic from 'next/dynamic'
import { ImageLightbox, ThinkingBlock, stripThinking } from './MarkdownMessage'
const MarkdownMessage = dynamic(
  () => import('./MarkdownMessage').then((m) => m.MarkdownMessage),
  { ssr: false }
)
import { AudioButton } from './AudioButton'
import { VoiceInput } from './VoiceInput'
import { WaveformPlayer } from './WaveformPlayer'
import { GlobalAudioBar } from './GlobalAudioBar'
import { CommandPalette, SLASH_COMMANDS } from './CommandPalette'
import { ModelPicker } from './ModelPicker'
import { EffortPicker } from './EffortPicker'
import { CompactSeparator } from './CompactSeparator'
import { DateSeparator } from './DateSeparator'
import { ToolCallCards } from './ToolCallCard'
import { AgentTaskCards } from './AgentTaskCard'
import { QuestionCards } from './QuestionCard'
import { TodoListWidget } from './TodoListWidget'
import { UsageBadge } from './UsageBadge'
import { AudioProvider } from '../contexts/AudioContext'
import { modelDisplayName } from '../stores/model-store'
import { ReaderOverlay } from './ReaderOverlay'

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      title="Copiar mensaje"
      aria-label="Copiar mensaje"
      className="flex items-center justify-center min-w-[36px] min-h-[36px] md:min-w-0 md:min-h-0 p-2 md:p-0.5 rounded-lg md:rounded text-muted/60 hover:text-muted hover:bg-card-hover md:hover:bg-transparent transition-colors"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  )
}

// ─── Reader button — abre el mensaje en la vista de lectura aislada ──────────
// (iOS Speak Screen / "Abrir lector" solo puede leer ese texto)

function ReaderBtn({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Abrir en lector"
        aria-label="Abrir la respuesta en el lector (texto plano para leer o escuchar)"
        className="flex items-center justify-center min-w-[36px] min-h-[36px] md:min-w-0 md:min-h-0 p-2 md:p-0.5 rounded-lg md:rounded text-muted/60 hover:text-muted hover:bg-card-hover md:hover:bg-transparent transition-colors"
      >
        <BookOpen size={14} />
      </button>
      {open && <ReaderOverlay content={text} onClose={() => setOpen(false)} />}
    </>
  )
}

// ─── User image attachment (reuses lightbox from MarkdownMessage) ─────────────

function UserImageAttachment({ src }: { src: string }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  // Support multiple URLs separated by newline
  const urls = src.split('\n').filter((u) => u.startsWith('http'))

  return (
    <>
      <div className={`mb-1.5 ${urls.length > 1 ? 'flex flex-wrap gap-1.5' : ''}`}>
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightboxUrl(url)}
            className={`block group/img relative rounded-lg overflow-hidden cursor-pointer focus:outline-none ${
              urls.length > 1 ? 'w-[calc(50%-3px)]' : ''
            }`}
          >
            <img
              src={url}
              alt={`Imagen ${i + 1}`}
              className={`rounded-lg border border-border object-cover transition-transform duration-200 group-hover/img:scale-[1.02] ${
                urls.length > 1 ? 'w-full h-24' : 'max-w-full max-h-48 object-contain'
              }`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover/img:opacity-100 transition-opacity text-foreground/85">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
              </span>
            </div>
          </button>
        ))}
      </div>
      {lightboxUrl && <ImageLightbox src={lightboxUrl} alt="Imagen adjunta" onClose={() => setLightboxUrl(null)} />}
    </>
  )
}

// ─── File attachment card (non-audio files) ──────────────────────────────────

function FileAttachmentCard({ attachment }: { attachment: FileAttachmentMeta }) {
  const isText = attachment.mimeType.startsWith('text/') || attachment.mimeType === 'application/json'
  const isCode = /\.(ts|js|py|sh|css|html|xml|yaml|yml)$/i.test(attachment.filename)
  const Icon = isCode ? FileCode : isText ? FileText : File

  const sizeLabel = attachment.size
    ? attachment.size < 1024 ? `${attachment.size} B`
    : attachment.size < 1024 * 1024 ? `${(attachment.size / 1024).toFixed(1)} KB`
    : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
    : null

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.filename}
      className="flex items-center gap-2.5 mt-2 px-3 py-2 rounded-xl bg-code-bg border border-code-border hover:bg-card-active hover:border-primary/30 transition-all group/file"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover/file:bg-primary/20 transition-colors">
        <Icon size={15} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground/85 font-medium truncate">{attachment.filename}</p>
        {sizeLabel && (
          <p className="text-[10px] text-muted/80">{sizeLabel}</p>
        )}
      </div>
      <Download size={14} className="text-muted/60 group-hover/file:text-primary transition-colors shrink-0" />
    </a>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
// Layout fase 2 paso 3 (modelo Claude iOS): el USER lleva burbuja neutra sutil a
// la derecha; el ASSISTANT es texto plano a TODO el ancho — sin caja y sin avatar
// por mensaje (la identidad del agente vive en el header). Metadata (hora, copy,
// audio, usage) se revela on-hover en desktop y queda visible en móvil.

interface MessageBubbleProps {
  msg: ChatMessage
  /** true solo para mensajes recién llegados — dispara la animación de entrada */
  isFresh?: boolean
  onAnswerQuestion?: (requestId: string, answers: Record<string, string> | null) => Promise<boolean>
  /** texto del user msg anterior — habilita "Reintentar" en burbujas de error */
  retryText?: string
  onRetry?: (text: string) => void
}

export const MessageBubble = memo(function MessageBubble({ msg, isFresh = false, onAnswerQuestion, retryText, onRetry }: MessageBubbleProps) {
  const isUser = msg.role === 'user'
  const isVoiceNote = isUser && !!msg.audioUrl
  const hasAssistantAudio = !isUser && !!msg.audioUrl

  // Detect slash commands
  const cmdMatch = isUser ? SLASH_COMMANDS.find((c) => msg.content.trim().startsWith(c.name)) : null
  const isCommand = !!cmdMatch

  const time = msg.timestamp.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Strip "[Nota de voz]: " prefix for display
  const transcription = isVoiceNote
    ? msg.content.replace(/^\[Nota de voz\]:\s*/i, '').trim()
    : null

  // ── USER: burbuja morada a la derecha (identidad Titaniumorphism) ──
  if (isUser) {
    return (
      <div className={`flex justify-end ${isFresh ? 'msg-enter' : ''}`}>
        <div className="group max-w-[85%] md:max-w-[75%] min-w-0 overflow-hidden px-4 py-2.5 text-[15px] leading-relaxed msg-bubble-own rounded-br-md">
          {msg.imageUrl && <UserImageAttachment src={msg.imageUrl} />}
          {isVoiceNote && msg.audioUrl ? (
            <>
              <WaveformPlayer audioUrl={msg.audioUrl} messageId={msg.id} isUser />
              {transcription && (
                <p className="text-[11px] text-muted mt-1.5 italic leading-relaxed">
                  {transcription}
                </p>
              )}
            </>
          ) : isCommand && cmdMatch ? (
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cmdMatch.iconClass}`}>
                <cmdMatch.icon size={13} strokeWidth={1.75} />
              </div>
              <span className="font-mono font-semibold text-[13px] text-foreground">{cmdMatch.name}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
          <div aria-hidden className="flex items-center justify-end mt-1 gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            <CopyBtn text={msg.content} />
            <p className="text-[10px] text-muted/80">{time}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── ASSISTANT: texto plano a TODO el ancho (fase 2 paso 3, modelo Claude iOS:
  // cero avatar por mensaje — la identidad del agente vive en el header) ──
  return (
    <div className={isFresh ? 'msg-enter' : ''}>
      {/* <article>: ancla semántica para extractores tipo Reader / iOS Speak
          Screen — el chrome interno (tools, thinking, footer) va aria-hidden,
          así el lector recibe solo el texto de la respuesta. */}
      <article className={`group min-w-0 text-[15px] leading-relaxed ${msg.error ? 'rounded-xl px-3.5 py-2.5 bg-error/10 border border-error/20 text-error' : ''}`}>
        {msg.error && (
          <div className="flex items-center gap-1.5 mb-1 text-error/80">
            <AlertCircle size={12} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Error</span>
          </div>
        )}

        {msg.metadata?.source === 'cron' && (
          <div aria-hidden className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card border border-border text-[10px] font-medium text-muted">
              <Clock size={10} />
              {msg.metadata.jobLabel ?? msg.metadata.jobId ?? 'Cron'}
            </span>
          </div>
        )}

        {/* Live thinking block (colapsado por default). El toggle aparece desde
            status:'requesting' — actividad visible sin esperar el primer token. */}
        {msg.thinking !== undefined && (
          <ThinkingBlock text={msg.thinking} streaming={msg.streaming} />
        )}

        {/* Live TODO list — plan por fases del agente (TodoWrite) */}
        {msg.todos && msg.todos.length > 0 && (
          <TodoListWidget todos={msg.todos} />
        )}

        {/* Compactando: mismo lenguaje de pill que el resto de estados del turno */}
        {msg.streaming && msg.status === 'compacting' && (
          <span aria-hidden className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300/90 mb-1.5">
            <svg className="animate-spin h-2.5 w-2.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
            Compactando contexto…
          </span>
        )}

        {/* Subagentes/workflows en background — cards vivas (agent-view) */}
        {msg.tasks && msg.tasks.length > 0 && (
          <AgentTaskCards tasks={msg.tasks} />
        )}

        {/* Tool call cards (shown above response text) */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <ToolCallCards tools={msg.toolCalls} inputs={msg.toolInputs} />
        )}

        {/* Resumen display-friendly del batch de tools (SDK 0.3.179+) */}
        {msg.toolSummaries && msg.toolSummaries.length > 0 && (
          <p aria-hidden className="flex items-start gap-1.5 text-[10px] text-muted/70 italic mb-1 leading-snug">
            <Wrench size={10} className="shrink-0 mt-px text-muted/50" aria-hidden />
            <span>{msg.toolSummaries.join(' · ')}</span>
          </p>
        )}

        {msg.content ? (
          // Cursor ▍ pegado al final del texto mientras streamea (feel Claude) —
          // se inyecta en el markdown para quedar inline en el último nodo.
          <MarkdownMessage content={msg.streaming ? msg.content + ' ▍' : msg.content} />
        ) : msg.streaming && msg.thinking === undefined ? (
          <span aria-hidden className="inline-block w-2 h-4 bg-primary/70 animate-pulse rounded-sm" />
        ) : null}

        {/* Pregunta interactiva (AskUserQuestion): botones tocables */}
        {msg.questionPrompts && msg.questionPrompts.length > 0 && onAnswerQuestion && (
          <QuestionCards prompts={msg.questionPrompts} onAnswer={onAnswerQuestion} />
        )}

        {/* Reintentar en errores — reenvía el mensaje del user tal cual */}
        {msg.error && retryText && onRetry && (
          <button
            onClick={() => onRetry(retryText)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-error/15 border border-error/30 text-error hover:bg-error/25 transition-colors active:scale-[0.98]"
          >
            Reintentar
          </button>
        )}

        {/* Assistant audio attachment — rendered below text */}
        {hasAssistantAudio && msg.audioUrl && (
          <div className="mt-2">
            <WaveformPlayer audioUrl={msg.audioUrl} messageId={msg.id} isUser={false} />
          </div>
        )}
        {/* Non-audio file attachments — rendered as download cards */}
        {msg.fileAttachments?.filter((f) => !f.mimeType.startsWith('audio/')).map((attachment, i) => (
          <FileAttachmentCard key={i} attachment={attachment} />
        ))}

        {/* Sello de downgrade: el modelo que PEDISTE no fue el que RESPONDIÓ este
            turno (típicamente Fable declinó por seguridad y Opus contestó). Es
            señal, no chrome → siempre visible, no hover-gated como el usage. */}
        {!msg.streaming && msg.downgrade && (
          <div
            className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-500/90 border border-amber-400/20"
            title={
              msg.downgrade.refusal
                ? `${modelDisplayName(msg.downgrade.from) ?? msg.downgrade.from} declinó por seguridad${msg.downgrade.category ? ` (${msg.downgrade.category})` : ''} — ${modelDisplayName(msg.downgrade.to) ?? msg.downgrade.to} respondió este turno.`
                : `${modelDisplayName(msg.downgrade.from) ?? msg.downgrade.from} no estaba disponible — ${modelDisplayName(msg.downgrade.to) ?? msg.downgrade.to} respondió este turno.`
            }
          >
            <ShieldAlert size={11} className="shrink-0" />
            <span>
              {modelDisplayName(msg.downgrade.from) ?? msg.downgrade.from}
              {' → '}
              {modelDisplayName(msg.downgrade.to) ?? msg.downgrade.to}
              {' · '}
              {msg.downgrade.refusal ? 'seguridad' : 'capacidad'}
            </span>
          </div>
        )}

        {/* Footer: acciones + usage + hora — hover en desktop, visible en móvil.
            Solo cuando el turno terminó (Claude no muestra chrome durante stream). */}
        {!msg.streaming && msg.content && (
          // Footer accionable NO va aria-hidden: los botones (Escuchar/Copiar/Lector)
          // deben ser alcanzables por VoiceOver — así el usuario puede abrir el lector
          // con el screen reader activo. El ruido no accionable (usage + hora) sí se
          // oculta al árbol de accesibilidad para no ensuciar la lectura.
          <div className="flex items-center mt-1 gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            {/* stripThinking: en sesiones CLI recargadas el thinking va fundido
                en content (<!--thinking-->). Copiar/escuchar/leer NO debe arrastrarlo. */}
            <AudioButton text={stripThinking(msg.content)} messageId={msg.id} />
            <CopyBtn text={stripThinking(msg.content)} />
            <ReaderBtn text={stripThinking(msg.content)} />
            <div aria-hidden className="flex items-center gap-1.5 ml-1">
              {msg.usage && <UsageBadge usage={msg.usage} />}
              <p className="text-[10px] text-muted/70">{time}</p>
            </div>
          </div>
        )}
      </article>
    </div>
  )
}, (prev, next) => {
  const p = prev.msg, n = next.msg
  return p.content === n.content
    && p.streaming === n.streaming
    && p.error === n.error
    && p.toolCalls === n.toolCalls
    && p.toolInputs === n.toolInputs
    && p.thinking === n.thinking
    && p.todos === n.todos
    && p.tasks === n.tasks
    && p.toolSummaries === n.toolSummaries
    && p.questionPrompts === n.questionPrompts
    && p.status === n.status
    && p.usage === n.usage
    && p.downgrade === n.downgrade
    && p.compact === n.compact
    && prev.retryText === next.retryText
})

// ─── Magic-word highlight overlay ─────────────────────────────────────────────
// Renders the textarea content as a transparent ghost layer beneath, with
// "ultrathink" / "think harder" / "think hard" tinted with a rainbow gradient.
// The textarea itself uses `text-transparent` + visible caret so the user only
// sees the rendered overlay text. Selection still works because the textarea
// remains the actual input surface.

const MAGIC_WORDS_RE = /(\bultracode\b|\bultrathink\b|\bthink harder\b|\bthink hard\b)/gi

function hasUltrathink(input: string): boolean {
  return /\bultrathink\b/i.test(input)
}

// "ultracode" en el mensaje = ese turno entra al Workflow tool (orquestación
// multi-agente). Trigger nativo del Agent SDK 0.3.201 — violeta como en Claude Code.
function hasUltracodeWord(input: string): boolean {
  return /\bultracode\b/i.test(input)
}

// Stateless test (no /g flag) — safe to call without resetting lastIndex.
// Used to decide whether to activate the ghost-overlay technique. When the
// input has zero magic words we render a plain visible textarea, which avoids
// the scroll-desync class of bugs entirely (caret + text always in sync).
const MAGIC_WORDS_TEST = /\b(?:ultracode|ultrathink|think harder|think hard)\b/i
function hasAnyMagicWord(input: string): boolean {
  return MAGIC_WORDS_TEST.test(input)
}

function inferEffort(input: string): 'low' | 'medium' | 'high' | 'max' | undefined {
  if (/\bultrathink\b/i.test(input)) return 'max'
  if (/\bthink harder\b/i.test(input)) return 'high'
  if (/\bthink hard\b/i.test(input)) return 'medium'
  return undefined
}

function HighlightedInputOverlay({ value }: { value: string }) {
  if (!value) return null
  const parts = value.split(MAGIC_WORDS_RE)
  return (
    <>
      {parts.map((part, i) => {
        if (MAGIC_WORDS_RE.test(part)) {
          // Reset regex state — split + test on the same global regex shares lastIndex
          MAGIC_WORDS_RE.lastIndex = 0
          // ultracode = violeta sólido (paridad con Claude Code CLI);
          // la familia ultrathink conserva el gradiente rainbow.
          if (/^ultracode$/i.test(part)) {
            return (
              <span key={i} className="font-semibold text-brand-ink">
                {part}
              </span>
            )
          }
          return (
            <span
              key={i}
              className="font-semibold bg-gradient-to-r from-pink-400 via-violet-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent"
              style={{ backgroundSize: '200% 100%' }}
            >
              {part}
            </span>
          )
        }
        MAGIC_WORDS_RE.lastIndex = 0
        return <span key={i} className="text-foreground">{part}</span>
      })}
    </>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

// Página de historial: al abrir una sesión solo bajamos los últimos N mensajes
// (la sesión "Automatizaciones" acumula cientos = ~1.3MB si se baja completa).
// El resto se pagina hacia atrás bajo demanda.
const MESSAGES_PAGE_SIZE = 60

export function ChatPanel({ headerAction }: { headerAction?: ReactNode } = {}) {
  const { chatSessionsPanelOpen, toggleChatSessionsPanel, closeChatSessionsPanel } = useLayoutStore()
  const { profile } = useAuth()
  const history = useChatHistory()
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)

  // Espejo en ref del activeSession para callbacks capturados por streams en vuelo.
  // BUG que esto mata (detectado 6 jul con el default de conversación nueva): el
  // closure de onSave dentro de sendMessage se captura ANTES de que handleSend
  // pre-cree la sesión → al terminar el stream, `activeSession` del closure seguía
  // null y creaba una SEGUNDA sesión (duplicada, sin mapping SDK). El ref siempre
  // lee el valor actual.
  const activeSessionRef = useRef<ChatSession | null>(null)
  useEffect(() => { activeSessionRef.current = activeSession }, [activeSession])

  // Slash commands — static, no network call needed
  const [paletteQuery, setPaletteQuery] = useState<string | null>(null)
  const [paletteSelectedIndex, setPaletteSelectedIndex] = useState(0)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showEffortPicker, setShowEffortPicker] = useState(false)

  const handleSave = useCallback(
    async (userMsg: string, assistantMsg: string, extras: TurnExtras) => {
      // SDK-only ("sdk:*"): la verdad vive en el transcript del daemon — NO hay
      // filas en Supabase que escribir (intentarlo truena con el uuid y sin
      // resolve el ACK jamás dispara). Resolver sin guardar: el ACK significa
      // "estoy viendo el turno", no solo "lo guardé".
      if (activeSessionRef.current?.isSDKOnly) return
      // Session is pre-created in handleSend (via ref: los closures en vuelo ven
      // la sesión actual, no la del render en que arrancó el stream). Fallback a
      // createSession solo para edge cases (cron injection, background completion).
      const session = activeSessionRef.current ?? (await history.createSession(userMsg))
      if (!activeSessionRef.current) {
        activeSessionRef.current = session
        setActiveSession(session)
      }
      // Metadata del assistant: extras del turno (attachments, tasks, summaries,
      // preguntas, sugerencias, usage) — reconstruyen la conversación al recargar.
      const assistantMeta: Record<string, unknown> = {}
      // turnId en AMBAS filas: el índice único (metadata->>'turnId', role) hace
      // atómico el dedupe contra el guardado de respaldo del server.
      if (extras.turnId) assistantMeta.turnId = extras.turnId
      if (extras.fileAttachments?.length) assistantMeta.fileAttachments = extras.fileAttachments
      if (extras.tasks?.length) assistantMeta.tasks = extras.tasks
      if (extras.toolSummaries?.length) assistantMeta.toolSummaries = extras.toolSummaries
      if (extras.questionPrompts?.length) assistantMeta.questionPrompts = extras.questionPrompts
      if (extras.suggestions?.length) assistantMeta.suggestions = extras.suggestions
      if (extras.usage) assistantMeta.usage = extras.usage
      if (extras.downgrade) assistantMeta.downgrade = extras.downgrade
      await history.saveMessages(session.id, [
        { role: 'user', content: userMsg, audioUrl: extras.audioUrl, imageUrl: extras.imageUrl, metadata: extras.turnId ? { turnId: extras.turnId } : undefined },
        { role: 'assistant', content: assistantMsg, audioUrl: extras.assistantAudioUrl, metadata: Object.keys(assistantMeta).length > 0 ? assistantMeta : undefined },
      ])
    },
    [history],
  )

  // Refs y state declarados ANTES del useChat porque el callback onRestoreInput
  // (capturado por el hook) los necesita en scope.
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')

  // Deep-link AI-first (?draft=): otras superficies (ej. sala Acciones del
  // otras superficies) prellenan el input con un prompt para el agente. El owner lo
  // revisa/completa y manda — NUNCA se auto-envía.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const draft = params.get('draft')
    if (!draft) return
    setInput(draft)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }, [])

  // Ancla de turno estilo Claude iOS: al enviar, tu mensaje queda ARRIBA del
  // viewport y un spacer reserva la pantalla para la respuesta. Declarados aquí
  // (antes de onRestoreInputCb y handleSelectSession, que los capturan).
  const turnSpacerRef = useRef<HTMLDivElement>(null)
  const anchorPendingRef = useRef(false)                    // "acabo de enviar → anclar pre-paint"
  const anchorActiveRef = useRef(false)                     // spacer vivo para el último turno

  // Callback invocado por useChat cuando ESC durante streaming hace rollback del turno.
  // Restaura el texto del user al textarea + focus + cursor al final + auto-resize.
  // Pattern Claude Code CLI: el user ve el texto como si nunca hubiera enviado.
  const onRestoreInputCb = useCallback((text: string) => {
    // ESC rollback / rewind: el turno desaparece — el ancla y su spacer también.
    anchorActiveRef.current = false
    anchorPendingRef.current = false
    setInput(text)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
      el.setSelectionRange(text.length, text.length)
    })
  }, [])

  const { messages, loading, sendMessage, resumeStream, loadMessages, prependMessages, clearMessages, restoreMessages, appendMessage, stopStreaming, detachStream, currentModel, setCurrentEffort, removeMessages, suggestions, answerQuestion } = useChat({
    sessionId: activeSession?.id,
    onSave: handleSave,
    onRestoreInput: onRestoreInputCb,
    // Guard del resume: la sesión que se va a reenganchar debe seguir siendo la
    // activa en ESTE momento (no la del render en que arrancó el resume).
    isSessionActive: useCallback((sid: string) => activeSessionRef.current?.id === sid, []),
  })

  // Espejo de `loading` para leerlo sin stale closures dentro de callbacks async
  const chatLoadingRef = useRef(false)
  useEffect(() => { chatLoadingRef.current = loading }, [loading])

  // Espejos de messages/suggestions para el snapshot de unmount (chat-view-cache)
  // y para guards en callbacks async — sin re-crear closures por cada delta.
  const messagesRef = useRef<ChatMessage[]>([])
  useEffect(() => { messagesRef.current = messages }, [messages])
  const suggestionsRef = useRef<string[]>([])
  useEffect(() => { suggestionsRef.current = suggestions }, [suggestions])

  // Seed the persisted effort so `/effort` reflects ClaudeClaw's in-memory level.
  useEffect(() => {
    fetch('/api/chat/efforts')
      .then((r) => r.json())
      .then((data) => { if (data?.current !== undefined) setCurrentEffort(data.current) })
      .catch(() => {})
  }, [setCurrentEffort])

  const bottomRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesContentRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const hasAutoLoaded = useRef(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  // Paginación de historial
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const hasMoreRef = useRef(false)
  const loadingOlderRef = useRef(false)
  const oldestLoadedRef = useRef<string | null>(null)      // created_at crudo del mensaje más viejo cargado
  const selectSeqRef = useRef(0)                            // guard contra switches rápidos de sesión
  const pinToBottomRef = useRef(false)                      // "acabo de cargar sesión → pin al fondo pre-paint"
  const prependAnchorRef = useRef<{ prevHeight: number; prevTop: number } | null>(null)
  const restoreScrollRef = useRef<number | null>(null)      // scrollTop exacto a restaurar (caché en memoria)
  // Id de la sesión restaurada desde el caché en memoria. Marca IDEMPOTENTE, no
  // flag consumible: el double-invoke de StrictMode re-corre los efectos y un
  // one-shot que se limpia en la 1a pasada deja a la 2a forzando el fondo.
  const restoredSessionIdRef = useRef<string | null>(null)
  const lastScrollTopRef = useRef(0)                        // último scrollTop conocido (los DOM refs ya son null en el cleanup de unmount)

  const setHasMore = useCallback((v: boolean) => {
    hasMoreRef.current = v
    setHasMoreHistory(v)
  }, [])
  const [pendingImages, setPendingImages] = useState<{ file: File; previewUrl: string }[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const MAX_IMAGES = 10

  // Ghost overlay activates only when the user typed a magic word (ultrathink /
  // think harder / think hard). Outside that case the textarea renders normally
  // — caret + glyphs share the same scroll position, no desync possible.
  const showOverlay = !!input && hasAnyMagicWord(input)

  // When the overlay IS active and content overflows max-h, the browser auto-
  // scrolls the textarea to keep the caret visible. The native `scroll` event
  // catches most of that via onScroll, but on iOS Safari the event sometimes
  // doesn't fire for keyboard-driven scroll. This belt-and-suspenders sync runs
  // after every input change in the same paint frame as the layout, then once
  // more on the next animation frame (after the browser settled the caret).
  useLayoutEffect(() => {
    if (!showOverlay) return
    const ta = textareaRef.current
    const ov = overlayRef.current
    if (!ta || !ov) return
    ov.scrollTop = ta.scrollTop
    const raf = requestAnimationFrame(() => { ov.scrollTop = ta.scrollTop })
    return () => cancelAnimationFrame(raf)
  }, [input, showOverlay])

  const showChatError = useCallback((msg: string) => {
    setChatError(msg)
    setTimeout(() => setChatError((curr) => (curr === msg ? null : curr)), 5000)
  }, [])

  // Spacer dinámico estilo Claude iOS: al enviar, el último turno (tu mensaje +
  // la respuesta creciendo) tiene reservada una pantalla completa. El spacer
  // decrece 1:1 conforme la respuesta crece → scrollHeight constante → cero
  // saltos. Si la respuesta rebasa el viewport, sigue debajo del fold SIN
  // arrastrarte (lectura anclada en tu mensaje) y aparece el botón ↓.
  const updateTurnSpacer = useCallback(() => {
    const container = messagesContainerRef.current
    const spacer = turnSpacerRef.current
    if (!container || !spacer) return
    if (!anchorActiveRef.current) {
      if (spacer.style.height && spacer.style.height !== '0px') spacer.style.height = '0px'
      return
    }
    const content = messagesContentRef.current
    const userNodes = content?.querySelectorAll<HTMLElement>('[data-msg-role="user"]')
    const lastUser = userNodes?.length ? userNodes[userNodes.length - 1] : null
    if (!lastUser) {
      spacer.style.height = '0px'
      return
    }
    // Altura del turno = del top del último mensaje del user al inicio del spacer.
    // offsetTop de ambos es relativo al contenedor scrolleable (offsetParent
    // posicionado), y el offsetTop del spacer no depende de su propia altura.
    const turnHeight = spacer.offsetTop - lastUser.offsetTop
    const target = Math.max(0, container.clientHeight - turnHeight - 24)
    spacer.style.height = `${target}px`
    // El crecimiento del contenido NO dispara eventos de scroll: recalcular aquí
    // "sigo al fondo?" para que el botón ↓ aparezca cuando la respuesta rebasa
    // el viewport (misma fórmula que handleMessagesScroll).
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80
    isAtBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }, [])

  // Auto-scroll only when user is at the bottom (smart scroll).
  // Instantáneo, NO smooth: los scrolls smooth se interrumpen en iOS cuando el
  // contenido crece a mitad de animación y dejaban isAtBottomRef en false a
  // medio camino (el scroll handler corre también en scrolls programáticos) —
  // esa race apagaba el auto-scroll para todo el resto del turno.
  useEffect(() => {
    // Turno anclado en streaming: la lectura se queda en tu mensaje (patrón
    // Claude iOS) — no perseguimos el fondo mientras la respuesta crece.
    if (anchorActiveRef.current && loading) return
    if (isAtBottomRef.current) {
      const el = messagesContainerRef.current
      if (el) {
        requestAnimationFrame(() => {
          // Re-verificar al EJECUTAR, no solo al agendar: el rAF del mount
          // (atBottom=true default) aterriza DESPUÉS del restore del caché y
          // pineaba el fondo pisando la posición restaurada.
          if (!isAtBottomRef.current || restoreScrollRef.current != null) return
          el.scrollTop = el.scrollHeight
        })
      } else {
        bottomRef.current?.scrollIntoView()
      }
    }
  }, [messages, loading])

  // Al abrir/cambiar de conversación, aparecer HASTA ABAJO (lo más reciente).
  // El pin real ocurre pre-paint en el useLayoutEffect de abajo, cuando los
  // mensajes YA están en el DOM (el rAF post-paint de antes corría ANTES de que
  // el fetch async terminara de renderizar → a veces no aterrizaba abajo).
  // EXCEPCIÓN: view restaurado del caché en memoria con scroll propio — ese
  // cambio de sesión NO debe forzar el fondo (pisaría la posición restaurada).
  useEffect(() => {
    // Restore de scroll PENDIENTE (aún no consumido por el layout effect): no
    // forzar fondo. Cubre el 2º pase de StrictMode, que corre con activeSession
    // todavía null (closure del mount) y se saltaba el guard por id.
    if (restoreScrollRef.current != null) return
    // Restore YA aplicado a esta sesión: tampoco forzar fondo.
    if (activeSession?.id && activeSession.id === restoredSessionIdRef.current) return
    isAtBottomRef.current = true
    setShowScrollBtn(false)
  }, [activeSession?.id])

  // Pin/anclaje síncrono ANTES del paint del render que trae mensajes nuevos:
  //  - restoreScrollRef: view restaurado desde el caché en memoria → volver a
  //    la posición EXACTA donde estabas al salir de la pestaña.
  //  - pinToBottomRef: sesión recién cargada → aterrizar en el último mensaje
  //    sin flash del top (useLayoutEffect corre antes de que el browser pinte).
  //  - prependAnchorRef: historial viejo prepended → conservar la posición
  //    visual exacta (scrollTop compensado por el alto agregado arriba).
  useLayoutEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    // Sin mensajes renderizados no hay nada que anclar — y CONSUMIR los refs
    // aquí sería fatal: el doble-invoke de StrictMode (dev) re-corre este efecto
    // con el closure viejo (lista vacía) y se comía restoreScrollRef contra el
    // contenedor vacío (scrollTop clampeado a ~0) antes del commit real.
    if (messages.length === 0) return
    if (restoreScrollRef.current != null) {
      el.scrollTop = restoreScrollRef.current
      restoreScrollRef.current = null
      return
    }
    if (prependAnchorRef.current) {
      const { prevHeight, prevTop } = prependAnchorRef.current
      prependAnchorRef.current = null
      el.scrollTop = prevTop + (el.scrollHeight - prevHeight)
      return
    }
    if (pinToBottomRef.current) {
      pinToBottomRef.current = false
      el.scrollTop = el.scrollHeight
      isAtBottomRef.current = true
    }
  }, [messages])

  // Ancla del turno recién enviado (pre-paint): tu mensaje aterriza ARRIBA del
  // viewport con el spacer reservando la pantalla para la respuesta — el
  // comportamiento de Claude iOS/ChatGPT al enviar. El user bubble se renderiza
  // síncrono (texto plano, sin dynamic import), así que ya está en el DOM aquí.
  useLayoutEffect(() => {
    if (!anchorPendingRef.current) return
    const container = messagesContainerRef.current
    const content = messagesContentRef.current
    if (!container || !content) return
    const userNodes = content.querySelectorAll<HTMLElement>('[data-msg-role="user"]')
    const lastUser = userNodes.length ? userNodes[userNodes.length - 1] : null
    if (!lastUser) return
    anchorPendingRef.current = false
    anchorActiveRef.current = true
    updateTurnSpacer()
    container.scrollTop = Math.max(0, lastUser.offsetTop - 12)
    isAtBottomRef.current = true
    setShowScrollBtn(false)
  }, [messages, updateTurnSpacer])

  // Mantener el fondo pegado mientras el contenido CRECE después del primer
  // paint (MarkdownMessage monta async por dynamic import, imágenes cargan,
  // etc.) — solo cuando el user ya está abajo. Sin esto, el "último mensaje"
  // queda a media pantalla cuando el markdown termina de montar.
  useEffect(() => {
    const content = messagesContentRef.current
    const el = messagesContainerRef.current
    if (!content || !el) return
    const observer = new ResizeObserver(() => {
      // El spacer se recalcula en cada cambio de tamaño del contenido (la
      // respuesta creciendo lo consume 1:1 → scrollHeight estable).
      updateTurnSpacer()
      // Turno anclado en streaming: NO perseguir el fondo (lectura anclada).
      if (anchorActiveRef.current && chatLoadingRef.current) return
      if (isAtBottomRef.current) el.scrollTop = el.scrollHeight
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [activeSession?.id, loadingSession, messages.length > 0, updateTurnSpacer])

  // Track whether user is near the bottom — show/hide scroll button.
  // Cerca del top + hay historial → auto-cargar la página anterior.
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    isAtBottomRef.current = atBottom
    // Copia viva para el snapshot de unmount (chat-view-cache): en el cleanup
    // de unmount React ya soltó los DOM refs — el contenedor es null ahí.
    lastScrollTopRef.current = el.scrollTop
    setShowScrollBtn(!atBottom)
    if (el.scrollTop < 300 && hasMoreRef.current && !loadingOlderRef.current) {
      loadOlderRef.current?.()
    }
  }, [])

  // Jump to bottom (used by button + after sending a message)
  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    isAtBottomRef.current = true
    setShowScrollBtn(false)
  }, [])

  // When the container resizes (keyboard open/close), scroll to bottom if we were there.
  // This fixes the scroll-position drift that leaves messages cut off after keyboard dismiss.
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      // El viewport cambió (teclado abre/cierra): el spacer se redimensiona a la
      // nueva pantalla disponible antes de decidir el pin.
      updateTurnSpacer()
      if (isAtBottomRef.current) el.scrollTop = el.scrollHeight
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateTurnSpacer])

  // Auto-resize textarea — done inline in handleInputChange (no useEffect needed)

  const handleSelectSession = useCallback(
    async (session: ChatSession) => {
      // If streaming in another session, detach it (let it continue in background)
      detachStream()
      const seq = ++selectSeqRef.current
      setActiveSession(session)
      localStorage.setItem('mc_lastChatSessionId', session.id)
      // sessionStorage = memoria de NAVEGACIÓN (sobrevive cambios de tab dentro
      // de la app, muere al cerrarla): el cold open sigue aterrizando en
      // conversación nueva (decisión 2 jul), pero tab-switch regresa aquí.
      try { sessionStorage.setItem('mc_activeChatSessionId', session.id) } catch { /* storage lleno/privado */ }
      anchorActiveRef.current = false
      anchorPendingRef.current = false
      setHasMore(false)
      oldestLoadedRef.current = null

      // 1) Pintar AL INSTANTE desde el snapshot local (si existe): el chat entra
      //    al toque con la última página conocida, sin esperar red ni skeleton.
      let painted = false
      try {
        const cached = await getCachedSnapshot<{ messages: PersistedMessage[]; hasMore: boolean }>(
          `chat:messages:${session.id}`,
        )
        if (seq === selectSeqRef.current && cached?.messages?.length) {
          loadMessages(cached.messages)
          setHasMore(cached.hasMore)
          oldestLoadedRef.current = cached.messages[0]?.created_at ?? null
          pinToBottomRef.current = true
          painted = true
        }
      } catch { /* sin snapshot — flujo normal */ }
      if (seq !== selectSeqRef.current) return
      if (!painted) setLoadingSession(true)

      // 2) Revalidar contra el server: solo la ÚLTIMA página (no todo el historial)
      try {
        const { messages: fresh, hasMore } = await history.loadMessages(session.id, {
          limit: MESSAGES_PAGE_SIZE,
        })
        if (seq !== selectSeqRef.current) return
        // Si el user ya está enviando un mensaje en esta sesión, no pisar el
        // estado en vuelo con la página del server (llega por realtime igual).
        if (!chatLoadingRef.current) {
          loadMessages(fresh)
          setHasMore(hasMore)
          oldestLoadedRef.current = fresh[0]?.created_at ?? null
          // Solo re-pinear si el user sigue abajo — si ya scrolleó hacia arriba
          // mientras revalidábamos, no lo arrancamos de donde está leyendo.
          pinToBottomRef.current = isAtBottomRef.current
        }
        cacheSnapshot('chat', `chat:messages:${session.id}`, { messages: fresh, hasMore }).catch(() => {})
      } finally {
        if (seq === selectSeqRef.current) setLoadingSession(false)
      }

      // Resume: si esta sesión tiene un turno EN VUELO en el daemon (la elegiste
      // mientras el agente respondía), reengánchate al vivo. No-op si no hay turno.
      if (seq === selectSeqRef.current) {
        void resumeStream(session.id)
      }
    },
    [history, loadMessages, detachStream, setHasMore, resumeStream],
  )

  // Paginación hacia atrás: baja la página anterior y PREPENDEA conservando la
  // posición visual (anchor pre-paint arriba). Disparada por botón o al acercarse
  // al top del scroll.
  const loadOlderMessages = useCallback(async () => {
    const session = activeSession
    if (!session || session.isSDKOnly) return
    if (loadingOlderRef.current || !hasMoreRef.current || !oldestLoadedRef.current) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    const seq = selectSeqRef.current
    try {
      const { messages: older, hasMore } = await history.loadMessages(session.id, {
        limit: MESSAGES_PAGE_SIZE,
        before: oldestLoadedRef.current,
      })
      // Si el user cambió de sesión mientras bajaba la página, descartar
      if (seq !== selectSeqRef.current) return
      if (older.length > 0) {
        oldestLoadedRef.current = older[0]?.created_at ?? oldestLoadedRef.current
        const el = messagesContainerRef.current
        if (el) prependAnchorRef.current = { prevHeight: el.scrollHeight, prevTop: el.scrollTop }
        prependMessages(older)
      }
      setHasMore(hasMore)
    } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }, [activeSession, history, prependMessages, setHasMore])

  // Ref estable para que el scroll handler (deps []) pueda dispararla
  const loadOlderRef = useRef(loadOlderMessages)
  useEffect(() => { loadOlderRef.current = loadOlderMessages }, [loadOlderMessages])

  // ── Recuperación al volver a la app (teléfono bloqueado / app en background) ──
  // Cuando el cliente se desconecta a mitad de un turno, ClaudeClaw termina en
  // background y guarda via /api/chat/complete. Pero Supabase Realtime NO reenvía
  // eventos perdidos mientras el websocket estuvo muerto: si el INSERT ocurrió con
  // el teléfono bloqueado, ese mensaje jamás llega al canal. Patrón estándar de
  // apps de chat (Claude iOS / ChatGPT): reconciliar contra el server en cada
  // regreso al foreground. La push sigue siendo el aviso; esto es la red de pesca.
  // También se reusa como revalidación en background tras restaurar el view
  // desde el caché en memoria (navegación entre tabs).
  const lastForegroundSyncRef = useRef(0)
  const refreshActiveSession = useCallback(async () => {
    const session = activeSessionRef.current
    if (!session) return
    if (chatLoadingRef.current) return // stream vivo en ESTE cliente: no pisar el turno en vuelo
    const now = Date.now()
    if (now - lastForegroundSyncRef.current < 1500) return // visibility+focus+pageshow disparan juntos
    lastForegroundSyncRef.current = now

    // Resume PRIMERO: si el daemon tiene un turno EN VUELO para esta sesión
    // (reabriste la app a mitad del streaming), reengánchate al vivo y sigue
    // justo donde va — sin recargar la BD. Si no hay turno vivo, cae a la
    // reconciliación normal. Aplica también a sesiones SDK-only.
    try {
      const attached = await resumeStream(session.id)
      if (attached) return
    } catch { /* sin turno vivo — reconciliar abajo */ }

    // Reconciliación contra BD: solo sesiones Supabase (las SDK-only viven en el
    // transcript del daemon; su verdad se recarga al seleccionarlas).
    if (session.isSDKOnly) return
    if (chatLoadingRef.current) return // el resume pudo enganchar un turno vivo
    try {
      const { messages: fresh, hasMore } = await history.loadMessages(session.id, { limit: MESSAGES_PAGE_SIZE })
      // El mundo pudo cambiar durante el fetch: sesión distinta o envío en curso
      if (activeSessionRef.current?.id !== session.id || chatLoadingRef.current) return
      if (fresh.length === 0) return
      // Turno detacheado a medio stream (cambiaste de tab mientras el agente respondía):
      // el parcial local aún no existe en el server — reemplazar lo borraría de
      // pantalla. Merge aditivo; el resultado final llega por realtime/refetch.
      const lastLocal = messagesRef.current[messagesRef.current.length - 1]
      const hasDetachedPartial =
        lastLocal?.role === 'assistant' && lastLocal.id.startsWith('a-') && !!lastLocal.content.trim()
      if (isAtBottomRef.current && !hasDetachedPartial) {
        // En el fondo (caso normal al volver): estado 100% fiel al server —
        // incluye el turno que se completó mientras estabas fuera.
        loadMessages(fresh)
        setHasMore(hasMore)
        oldestLoadedRef.current = fresh[0]?.created_at ?? null
        pinToBottomRef.current = true
        cacheSnapshot('chat', `chat:messages:${session.id}`, { messages: fresh, hasMore }).catch(() => {})
      } else {
        // Leyendo historial arriba (o hay parcial local): merge aditivo sin mover el scroll
        for (const m of fresh) {
          appendMessage({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at),
            audioUrl: m.audio_url ?? undefined,
            imageUrl: m.image_url ?? undefined,
            metadata: m.metadata ?? undefined,
          })
        }
      }
    } catch { /* red aún dormida al despertar — el próximo trigger reintenta */ }
  }, [history, loadMessages, appendMessage, setHasMore, resumeStream])

  useEffect(() => {
    const onForeground = () => {
      if (document.visibilityState === 'hidden') return
      refreshActiveSession()
    }
    document.addEventListener('visibilitychange', onForeground)
    window.addEventListener('focus', onForeground)
    window.addEventListener('pageshow', onForeground) // bfcache restore (iOS PWA)
    window.addEventListener('online', onForeground)
    return () => {
      document.removeEventListener('visibilitychange', onForeground)
      window.removeEventListener('focus', onForeground)
      window.removeEventListener('pageshow', onForeground)
      window.removeEventListener('online', onForeground)
    }
  }, [refreshActiveSession])

  // Snapshot del view al DESMONTAR (navegar a otra pestaña): el caché en
  // memoria conserva lo ya abierto — mensajes deserializados, paginación y
  // scroll exacto — para que volver a /chat sea percepción de latencia CERO.
  useEffect(() => {
    return () => {
      const session = activeSessionRef.current
      if (!session) return
      const msgs = messagesRef.current
      if (msgs.length === 0) return
      saveChatView({
        session,
        // Sanitizar streams en vuelo: el detach marca streaming=false async y
        // puede correr DESPUÉS de este cleanup — sin esto, el view restaurado
        // mostraría un cursor ▍ fantasma pegado para siempre.
        messages: msgs.map((m) => (m.streaming ? { ...m, streaming: false, status: null } : m)),
        hasMore: hasMoreRef.current,
        oldestLoaded: oldestLoadedRef.current,
        // lastScrollTopRef y no el DOM ref: en este cleanup el contenedor ya es null
        scrollTop: !isAtBottomRef.current ? lastScrollTopRef.current : null,
        suggestions: suggestionsRef.current,
      })
    }
  }, [])

  // Default al abrir: conversación NUEVA — el chat
  // aterriza vacío, listo para escribir, sin bajar historial (cero red = cold
  // open aún más rápido). Dos EXCEPCIONES, en orden de prioridad:
  //   1. Deep-link ?session= (push/cron): esa sesión específica se abre.
  //   2. Navegación interna (tab-switch): cada cambio de ruta desmonta la página
  //      completa (no hay keep-alive), así que la sesión activa vive en
  //      sessionStorage — sobrevive moverse entre tabs, muere al cerrar la app.
  //      El cold open sigue aterrizando en conversación nueva.
  // We DON'T strip the query param — it's harmless (refresh just reopens the same
  // session) and manually editing window.history can confuse Next.js App Router on iOS PWA.
  useEffect(() => {
    if (hasAutoLoaded.current) return

    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('session')
    let fromNav: string | null = null
    try { fromNav = sessionStorage.getItem('mc_activeChatSessionId') } catch { /* modo privado */ }
    const targetId = fromUrl ?? fromNav

    if (!targetId) {
      // Sin deep-link ni sesión en curso: quedarse en conversación nueva. No
      // esperar a que carguen las sesiones — no las necesitamos para arrancar.
      hasAutoLoaded.current = true
      return
    }

    // Camino INSTANTÁNEO: si el view de esa sesión sigue en el caché en memoria
    // (navegación entre tabs), se restaura síncrono en este mismo render — cero
    // red, cero IndexedDB, cero espera de la lista de sesiones. Mensajes con su
    // estado rico (toolCalls/thinking/usage) y scroll exacto donde estabas.
    const cached = getChatView(targetId)
    if (cached) {
      hasAutoLoaded.current = true
      restoredSessionIdRef.current = cached.scrollTop != null ? cached.session.id : null
      activeSessionRef.current = cached.session
      setActiveSession(cached.session)
      setHasMore(cached.hasMore)
      oldestLoadedRef.current = cached.oldestLoaded
      restoreMessages(cached.messages, cached.suggestions)
      if (cached.scrollTop != null) {
        restoreScrollRef.current = cached.scrollTop
        isAtBottomRef.current = false
        setShowScrollBtn(true)
      } else {
        pinToBottomRef.current = true
        isAtBottomRef.current = true
      }
      // Revalidar contra el server SIN bloquear el paint (mismo camino que el
      // regreso al foreground — trae lo que haya llegado mientras no estabas).
      setTimeout(() => { void refreshActiveSession() }, 0)
      return
    }

    // Deep-link / restore sin caché: esperar la lista de sesiones para resolver el UUID.
    if (history.loading || history.sessions.length === 0) return
    hasAutoLoaded.current = true
    const target = history.sessions.find((s) => s.id === targetId)
    if (target) handleSelectSession(target)
  }, [history.loading, history.sessions, handleSelectSession, restoreMessages, refreshActiveSession, setHasMore])

  const handleNewChat = useCallback(async () => {
    // If streaming, detach it (let it continue in background)
    detachStream()
    setActiveSession(null)
    clearMessages()
    try { sessionStorage.removeItem('mc_activeChatSessionId') } catch { /* ignore */ }
    clearChatView()
    anchorActiveRef.current = false
    anchorPendingRef.current = false
    // Foco directo al composer — listo para escribir (paridad Claude/ChatGPT)
    requestAnimationFrame(() => textareaRef.current?.focus())
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'newchat' }),
      })
    } catch { /* ignore */ }
  }, [clearMessages, detachStream])

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await history.deleteSession(sessionId)
      if (getChatView(sessionId)) clearChatView()
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        clearMessages()
        try { sessionStorage.removeItem('mc_activeChatSessionId') } catch { /* ignore */ }
      }
    },
    [history, activeSession, clearMessages],
  )

  const handleToggleFavorite = useCallback(
    (sessionId: string) => history.toggleFavorite(sessionId),
    [history],
  )

  const handleRename = useCallback(
    (sessionId: string, title: string) => history.renameSession(sessionId, title),
    [history],
  )

  const attachImage = useCallback((file: File) => {
    // Accept image/* types + HEIC/HEIF (iOS may report empty type for HEIC)
    const isImage = file.type.startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|gif|webp)$/i.test(file.name)
    if (!isImage) return
    if (file.size > 10 * 1024 * 1024) return // 10MB max
    setPendingImages((prev) => {
      if (prev.length >= MAX_IMAGES) return prev
      const previewUrl = URL.createObjectURL(file)
      return [...prev, { file, previewUrl }]
    })
    textareaRef.current?.focus()
  }, [])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Copy FileList to array BEFORE resetting value — iOS Safari clears the
    // live FileList reference when e.target.value is reset
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    for (const file of files) {
      attachImage(file)
    }
  }, [attachImage])

  // Paste images from clipboard (Cmd+V / Ctrl+V / mobile paste)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) attachImage(file)
        return
      }
    }
    // If no image found, let the default paste behavior handle text
  }, [attachImage])

  const removePendingImage = useCallback((index: number) => {
    setPendingImages((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const clearAllPendingImages = useCallback(() => {
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      return []
    })
  }, [])

  const handleSend = async (text?: string) => {
    const msg = text ?? input
    if ((!msg.trim() && pendingImages.length === 0) || loading) return
    // /clear is handled locally — no need to round-trip to agent
    if (msg.trim() === '/clear') {
      handleNewChat()
      setInput('')
      setPaletteQuery(null)
      setPaletteSelectedIndex(0)
      return
    }
    // /model without args opens the picker
    if (msg.trim() === '/model') {
      setShowModelPicker(true)
      setInput('')
      setPaletteQuery(null)
      setPaletteSelectedIndex(0)
      return
    }
    // /effort without args opens the picker
    if (msg.trim() === '/effort') {
      setShowEffortPicker(true)
      setInput('')
      setPaletteQuery(null)
      setPaletteSelectedIndex(0)
      return
    }
    isAtBottomRef.current = true
    setShowScrollBtn(false)
    anchorPendingRef.current = true

    // Upload all pending images to Supabase Storage
    let imageUrl: string | undefined
    if (pendingImages.length > 0) {
      setUploadingImage(true)
      const total = pendingImages.length
      const uploadedUrls: string[] = []
      let failed = 0
      try {
        for (const img of pendingImages) {
          try {
            const form = new FormData()
            form.append('file', img.file)
            const res = await fetch('/api/storage/upload', { method: 'POST', body: form })
            if (!res.ok) throw new Error(await res.text())
            const { url } = await res.json()
            uploadedUrls.push(url)
          } catch {
            failed++
          }
        }
        if (uploadedUrls.length > 0) {
          imageUrl = uploadedUrls.join('\n')
        }
      } finally {
        pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
        setPendingImages([])
        setUploadingImage(false)
      }
      if (failed > 0) {
        showChatError(
          uploadedUrls.length === 0
            ? `No se pudo subir ${failed === 1 ? 'la imagen' : `ninguna de las ${total} imagenes`}. Mensaje cancelado.`
            : `Subieron ${uploadedUrls.length}/${total} imagenes. ${failed} fallaron.`
        )
        if (uploadedUrls.length === 0 && !msg.trim()) return
      }
    }

    const defaultMsg = pendingImages.length > 1 ? `Analiza estas ${pendingImages.length} imágenes` : 'Analiza esta imagen'
    const finalMsg = msg.trim() || defaultMsg

    // Reset del composer ANTES de cualquier await — el tap debe sentirse
    // instantáneo: input limpio + burbuja pintada en el mismo tick (React
    // batchea estos sets con el paint de sendMessage).
    setInput('')
    setPaletteQuery(null)
    setPaletteSelectedIndex(0)
    setShowModelPicker(false)
    setShowEffortPicker(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // La sesión debe existir antes del FETCH (ClaudeClaw mapea SDK session →
    // chat session; sin id caería a la sesión global 'mc-web' y mezclaría
    // contexto), pero NO antes del PAINT: se crea en background y sendMessage
    // la resuelve justo antes de disparar el stream. Antes este await bloqueaba
    // la UI ~200-500ms sin feedback (la latencia que se sentía al enviar).
    const sessionPromise = activeSession?.id
      ? undefined
      : history.createSession(finalMsg)
          .then((newSession) => {
            // Ref PRIMERO: el onSave del stream en vuelo lee el ref al terminar —
            // sin esto crearía una sesión duplicada (ver comentario de activeSessionRef).
            activeSessionRef.current = newSession
            setActiveSession(newSession)
            localStorage.setItem('mc_lastChatSessionId', newSession.id)
            try { sessionStorage.setItem('mc_activeChatSessionId', newSession.id) } catch { /* ignore */ }
            return newSession
          })
          .catch((err) => {
            console.error('[ChatPanel] Failed to pre-create session:', err)
            return null
          })

    const effort = inferEffort(finalMsg)
    sendMessage(finalMsg, {
      imageUrl,
      chatSessionId: activeSession?.id,
      ...(sessionPromise && { sessionPromise }),
      sdkSessionId: activeSession?.sdkSessionId,
      ...(effort && { effort }),
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (paletteQuery !== null) {
      const filtered = SLASH_COMMANDS.filter((c) =>
        c.name.slice(1).startsWith(paletteQuery.toLowerCase())
      )
      if (e.key === 'Escape') {
        setPaletteQuery(null)
        setPaletteSelectedIndex(0)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPaletteSelectedIndex((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPaletteSelectedIndex((i) => Math.min(filtered.length - 1, i + 1))
        return
      }
      // Tab (o Enter) selecciona el comando resaltado — paridad con editores/CLIs.
      // Shift+Tab retrocede en la lista.
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          setPaletteSelectedIndex((i) => Math.max(0, i - 1))
        } else {
          const cmd = filtered[paletteSelectedIndex] ?? filtered[0]
          if (cmd) handleCommandSelect(cmd.name)
        }
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const cmd = filtered[paletteSelectedIndex] ?? filtered[0]
        if (cmd) handleCommandSelect(cmd.name)
        return
      }
    }
    const isMobile = window.innerWidth < 768
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = useCallback((val: string) => {
    setInput(val)
    // Auto-resize inline — avoids useEffect extra render cycle + double-paint
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
      // Keep ghost overlay aligned with the textarea's internal scroll so the
      // caret line stays visible once the cap kicks in.
      if (overlayRef.current) overlayRef.current.scrollTop = el.scrollTop
    }
    // Palette updates are non-critical UI — defer to avoid blocking input responsiveness
    startTransition(() => {
      const match = val.match(/^\/([a-z]*)$/)
      if (match) {
        setPaletteQuery(match[1])
        setPaletteSelectedIndex(0)
      } else {
        setPaletteQuery(null)
        setPaletteSelectedIndex(0)
      }
    })
  }, [])

  const handleCommandSelect = (cmdName: string) => {
    if (cmdName === '/model') {
      setShowModelPicker(true)
      setPaletteQuery(null)
      setPaletteSelectedIndex(0)
      setInput('')
      return
    }
    if (cmdName === '/effort') {
      setShowEffortPicker(true)
      setPaletteQuery(null)
      setPaletteSelectedIndex(0)
      setInput('')
      return
    }
    // Send command immediately on click
    setPaletteQuery(null)
    setPaletteSelectedIndex(0)
    setInput('')
    handleSend(cmdName)
  }

  const handleEffortSelect = (effortValue: string) => {
    setShowEffortPicker(false)
    // Unlike /model, changing effort does NOT start a new conversation — it just
    // updates the in-memory preference for the next message. Round-trip through
    // ClaudeClaw so it persists server-side and echoes back effort_changed.
    anchorPendingRef.current = true
    sendMessage(`/effort ${effortValue}`, { chatSessionId: activeSession?.id })
  }

  const handleModelSelect = (modelValue: string) => {
    setShowModelPicker(false)
    if (modelValue !== 'default' && currentModel === modelValue) return // Same model, no action

    // Cambio mid-conversación (como Claude iOS): el daemon aplica el modelo al
    // próximo mensaje del mismo hilo — sin confirm() nativo ni conversación nueva.
    anchorPendingRef.current = true
    sendMessage(`/model ${modelValue}`, { chatSessionId: activeSession?.id })
  }

  const handleVoiceNote = useCallback((transcription: string, audioUrl: string) => {
    isAtBottomRef.current = true
    setShowScrollBtn(false)
    anchorPendingRef.current = true
    // Mismo patrón que handleSend: sin sesión activa, crearla en background —
    // antes una nota de voz en conversación nueva caía a la sesión global 'mc-web'.
    const sessionPromise = activeSession?.id
      ? undefined
      : history.createSession(transcription.slice(0, 80) || 'Nota de voz')
          .then((newSession) => {
            activeSessionRef.current = newSession
            setActiveSession(newSession)
            localStorage.setItem('mc_lastChatSessionId', newSession.id)
            try { sessionStorage.setItem('mc_activeChatSessionId', newSession.id) } catch { /* ignore */ }
            return newSession
          })
          .catch((err) => {
            console.error('[ChatPanel] Failed to pre-create session (voice):', err)
            return null
          })
    sendMessage(`[Nota de voz]: ${transcription}`, {
      audioUrl,
      chatSessionId: activeSession?.id,
      ...(sessionPromise && { sessionPromise }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendMessage, activeSession?.id])

  // ESC behavior — paridad con Claude Code CLI:
  //   - Single ESC durante streaming: rollback total del turno (msgs desaparecen + texto vuelve al input)
  //   - Doble ESC sin streaming (<400ms entre presses): rewind del ultimo turn completado
  //     (borra user msg + assistant msg del state local y de Supabase, restaura texto al input)
  //
  // Implementacion: handleRewindRef (siempre actualizado) evita re-mount del listener en cada
  // setMessages durante SSE — sin esto, `messages` en deps montaria/desmontaria el handler 60+/seg.
  const lastEscPressRef = useRef<number>(0)
  const ESC_DOUBLE_TAP_MS = 400

  const handleRewindRef = useRef<() => void>(() => {})
  handleRewindRef.current = useCallback(async () => {
    if (loading) return
    if (!activeSession) return
    if (activeSession.isSDKOnly) return  // SDK-only sessions son read-only desde MC
    if (messages.length < 2) return

    const lastMsg = messages[messages.length - 1]
    const prevMsg = messages[messages.length - 2]

    // Solo rewindear turnos completos: assistant terminado (no streaming, no error) seguido de user
    if (lastMsg.role !== 'assistant' || lastMsg.streaming || lastMsg.error) return
    if (prevMsg.role !== 'user') return
    // Cron messages no son turnos del user — no aplica rewind
    if ((prevMsg.metadata as { source?: string } | undefined)?.source === 'cron') return

    const userText = prevMsg.content

    // Optimistic UI: remover ambos del state, restaurar input (usa el mismo callback que rollback)
    removeMessages([prevMsg.id, lastMsg.id])
    onRestoreInputCb(userText)

    // DELETE en Supabase (best-effort, NO revertir state si falla — UX del teclado debe ser instant)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .in('id', [prevMsg.id, lastMsg.id])
      if (error) console.error('[ChatPanel] handleRewindLastTurn delete error:', error)
    } catch (err) {
      console.error('[ChatPanel] handleRewindLastTurn exception:', err)
    }
  }, [loading, activeSession, messages, removeMessages, onRestoreInputCb])

  // Track palette open state via ref para evitar re-mount del listener cuando paletteQuery cambia
  // (cada keystroke en el palette muta state). El listener no necesita re-registrarse para leer el ref.
  const paletteOpenRef = useRef(false)
  useEffect(() => { paletteOpenRef.current = paletteQuery !== null }, [paletteQuery])

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return

      // Si el palette de slash commands esta abierto, su propio handleKeyDown se encarga de cerrarlo.
      // No queremos que el global handler marque timestamp ni haga rewind — falsos positivos garantizados.
      if (paletteOpenRef.current) return

      if (loading) {
        // Single ESC durante streaming = rollback total (Fase 3)
        e.preventDefault()
        lastEscPressRef.current = 0  // reset, no encadenar con doble-ESC fantasma
        stopStreaming()
        return
      }

      // Sin streaming: detectar doble-tap para rewind del ultimo turn
      const now = Date.now()
      const elapsed = now - lastEscPressRef.current
      if (elapsed < ESC_DOUBLE_TAP_MS) {
        e.preventDefault()
        lastEscPressRef.current = 0
        handleRewindRef.current?.()
      } else {
        // Primer ESC: marcar timestamp, esperar segundo
        lastEscPressRef.current = now
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loading, stopStreaming])  // sin handleRewindRef ni paletteQuery en deps (ref pattern)

  // Listen for new-chat event from mobile Header
  useEffect(() => {
    const handler = () => handleNewChat()
    window.addEventListener('openclaw:new-chat', handler)
    return () => window.removeEventListener('openclaw:new-chat', handler)
  }, [handleNewChat])

  // Header móvil: tap en "<agente> / <modelo>" → abre el selector de modelos
  useEffect(() => {
    const handler = () => setShowModelPicker(true)
    window.addEventListener('openclaw:open-model-picker', handler)
    return () => window.removeEventListener('openclaw:open-model-picker', handler)
  }, [])

  // Listen for service worker messages — when user taps a push notification while
  // the app is already open on /chat, client.navigate() to the same route doesn't
  // remount the page, so the SW posts an explicit "open-chat-session" message.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; sessionId?: string } | null
      if (data?.type !== 'open-chat-session' || !data.sessionId) return
      const target = history.sessions.find((s) => s.id === data.sessionId)
      if (target) handleSelectSession(target)
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [history.sessions, handleSelectSession])

  // Realtime subscription: listen for new chat_messages on the active session
  useEffect(() => {
    if (!activeSession?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`chat_messages:${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            role: 'user' | 'assistant'
            content: string
            created_at: string
            audio_url?: string | null
            image_url?: string | null
            metadata?: { source?: string; jobId?: string; jobLabel?: string } | null
          }
          console.log('[realtime] Message received from Supabase:', {
            role: row.role,
            hasContent: !!row.content,
            contentPreview: row.content?.substring(0, 30),
            hasAudio: !!row.audio_url,
            hasImage: !!row.image_url,
            imageUrlPreview: row.image_url?.substring(0, 50),
          })
          appendMessage({
            id: row.id,
            role: row.role,
            content: row.content,
            timestamp: new Date(row.created_at),
            audioUrl: row.audio_url ?? undefined,
            imageUrl: row.image_url ?? undefined,
            metadata: row.metadata ?? undefined,
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeSession?.id, appendMessage])


  // Retry estable para burbujas de error: handleSend se re-crea cada render,
  // pero messagesList solo recomputa con [messages] — el ref evita closures stale.
  const handleSendRef = useRef<(text?: string) => void>(() => {})
  handleSendRef.current = handleSend
  const onRetryCb = useCallback((text: string) => { handleSendRef.current?.(text) }, [])

  // Memoize message list — prevents re-creating/diffing JSX on every keystroke
  const messagesList = useMemo(() => {
    const items: React.ReactNode[] = []
    let prevDate: string | null = null
    let prevRole: string | null = null
    const now = Date.now()

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const msgDate = msg.timestamp.toDateString()
      if (msgDate !== prevDate) {
        items.push(<DateSeparator key={`date-${msgDate}`} date={msg.timestamp} />)
        prevDate = msgDate
        prevRole = null // tras un separador de fecha, el avatar reaparece
      }
      // Ritmo vertical por hablante: racha del mismo rol = gap corto; cambio de
      // rol = gap amplio (jerarquía de turnos tipo Claude). Entrada animada solo
      // para mensajes recién llegados (timestamp fresco) — cargar una sesión
      // vieja NO dispara 60 animaciones.
      const sameRole = prevRole === msg.role
      const isFresh = now - msg.timestamp.getTime() < 3000
      const retryText = msg.role === 'assistant' && msg.error && messages[i - 1]?.role === 'user'
        && (messages[i - 1].metadata as { source?: string } | undefined)?.source !== 'cron'
        ? messages[i - 1].content
        : undefined
      items.push(
        <div key={msg.id} data-msg-role={msg.role} className={items.length === 0 ? '' : sameRole ? 'mt-1.5' : 'mt-5'}>
          {msg.compact && (
            <CompactSeparator
              tokensBefore={msg.compact.tokensBefore}
              tokensAfter={msg.compact.tokensAfter}
            />
          )}
          <MessageBubble
            msg={msg}
            isFresh={isFresh}
            onAnswerQuestion={answerQuestion}
            retryText={retryText}
            onRetry={retryText ? onRetryCb : undefined}
          />
        </div>
      )
      prevRole = msg.role
    }
    return items
  }, [messages, answerQuestion, onRetryCb])

  return (
    <AudioProvider>
    <div className="flex h-full min-h-0 overflow-hidden relative bg-background/40">
      {/* Mobile overlay backdrop */}
      {chatSessionsPanelOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          onClick={closeChatSessionsPanel}
        />
      )}

      {/* Sessions sidebar — cerrado queda fuera de pantalla (transform/w-0) pero
          seguía en el árbol de accesibilidad; inert lo oculta también para
          iOS Speak Screen ("Abrir lector"). */}
      <div
        inert={!chatSessionsPanelOpen}
        aria-hidden={!chatSessionsPanelOpen}
        className={`
        ${chatSessionsPanelOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${chatSessionsPanelOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden'}
        fixed md:relative z-20 md:z-0
        w-64 h-full
        bg-surface/95 md:bg-transparent backdrop-blur-xl
        transition-all duration-300 ease-in-out
      `}>
        <ChatSessions
          sessions={history.sessions}
          loading={history.loading}
          activeId={activeSession?.id ?? null}
          onSelect={(session) => { handleSelectSession(session); closeChatSessionsPanel() }}
          onNew={() => { handleNewChat(); closeChatSessionsPanel() }}
          onDelete={handleDeleteSession}
          onToggleFavorite={handleToggleFavorite}
          onRename={handleRename}
        />
      </div>

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        {/* Header — 3 zones: toggle | agente centrado | new chat — desktop only */}
        <div className="titanium-header shrink-0 relative hidden md:flex items-center px-4 py-3 border-b border-border-subtle z-10">
          {/* Left zone: toggle */}
          <button
            onClick={toggleChatSessionsPanel}
            className="icon-btn size-8"
            title="Conversaciones"
          >
            <MessageSquare size={14} />
          </button>

          {/* Center zone: avatar del agente + nombre (absolutely centered) */}
          <button
            onClick={() => setShowModelPicker(true)}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 pointer-events-auto select-none rounded-lg px-2 py-1 hover:bg-card-hover transition-colors"
            title="Cambiar modelo"
          >
            <div className="relative">
              <span className="flex w-8 h-8 items-center justify-center rounded-full bg-card border border-primary/40 shadow-depth-rest-soft">
                <BotIcon size={18} className="text-primary" aria-hidden />
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border border-background" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{AGENT_NAME}</p>
              <p className="text-[10px] text-muted flex items-center gap-0.5">
                {modelDisplayName(currentModel) ?? AGENT_NAME}
                <ChevronDown size={9} className="text-muted/70" />
              </p>
            </div>
          </button>

          {/* Right zone: mode toggle (Live) + new chat */}
          <div className="ml-auto flex items-center gap-1.5">
            {headerAction}
            <button
              onClick={handleNewChat}
              title="Nueva conversación"
              className="icon-btn size-8"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Global audio bar — appears when audio is playing */}
        <GlobalAudioBar />

        {/* Messages */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            data-scroll-region
            className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-4"
          >
            {loadingSession ? (
              // Skeleton neutro alineado a la izquierda — las conversaciones
              // reales están dominadas por respuestas del agente (menos reflow).
              <div className="max-w-3xl mx-auto flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-10 rounded-2xl bg-card animate-pulse ${i === 2 ? 'w-1/2' : 'w-3/4'}`} />
                ))}
              </div>
            ) : messages.length === 0 && !loading ? (
              // Estado vacío estilo Claude: saludo grande + starter prompts
              // tocables (estáticos, cero red — no tocan el cold open).
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-6">
                <span className="flex w-14 h-14 items-center justify-center rounded-2xl bg-card border border-brand/30 shadow-depth-rest-soft">
                  <BotIcon size={30} className="text-brand-ink" aria-hidden />
                </span>
                <div>
                  <p className="text-2xl md:text-[28px] font-semibold text-foreground tracking-tight">
                    Hola{profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}
                  </p>
                  <p className="text-sm text-muted mt-1.5">¿En qué trabajamos hoy?</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {[
                    { label: '🎯 Pendientes del board', prompt: '¿Qué tareas tengo pendientes en el board?' },
                    { label: '📅 Mi calendario', prompt: '¿Qué tengo agendado esta semana?' },
                    { label: '✅ Crear una tarea', prompt: 'Crea una tarea: ' },
                    { label: '🗂️ Organiza mi semana', prompt: 'Ayúdame a planear y priorizar mi semana' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSend(s.prompt)}
                      className="px-3.5 py-2 rounded-full text-[13px] text-foreground/85 bg-card border border-border
                        hover:border-brand/40 hover:bg-card-hover active:scale-[0.98] transition-all duration-150"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Columna de lectura centrada (~48rem) — consistente en cualquier
              // resolución, línea de texto legible (modelo Claude/ChatGPT).
              <div ref={messagesContentRef} className="max-w-3xl mx-auto">
                {hasMoreHistory && (
                  <div aria-hidden className="flex justify-center pb-1">
                    <button
                      onClick={() => loadOlderRef.current?.()}
                      disabled={loadingOlder}
                      className="px-3 py-1.5 rounded-full text-[11px] font-medium text-muted/80 bg-card hover:bg-card-hover border border-border-subtle transition-colors disabled:opacity-50"
                    >
                      {loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores'}
                    </button>
                  </div>
                )}
                {messagesList}

                {/* Follow-up suggestions (promptSuggestions del SDK) — chips
                    tocables bajo el último mensaje, solo cuando el turno terminó. */}
                {!loading && suggestions.length > 0 && (
                  <div aria-hidden className="flex flex-wrap gap-1.5 pt-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="max-w-full truncate px-3 py-1.5 rounded-full text-[11px] text-left
                          text-brand-ink/90 bg-brand/[0.07] border border-brand/20
                          hover:bg-brand/15 hover:border-brand/40 active:scale-[0.98]
                          transition-all duration-150"
                        title={s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Spacer del turno anclado — reserva viewport para la respuesta.
                    Altura manejada imperativamente (updateTurnSpacer) para no
                    re-renderizar la lista en cada delta del stream. */}
                <div ref={turnSpacerRef} aria-hidden className="shrink-0" />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Scroll-to-bottom button — appears when user scrolls up */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10
                icon-btn rounded-full
                hover:bg-card-hover active:scale-90"
              title="Ir al final"
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>

        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Input toolbar — glass bg extends through safe area like native iOS apps.
            aria-hidden (NO inert: el teclado/typing sigue normal): iOS Speak Screen
            debe terminar la lectura en la respuesta, no en el placeholder/botones. */}
        <div aria-hidden className="chat-input-toolbar shrink-0 bg-[var(--glass-bg)] backdrop-blur-xl border-t border-border-subtle">
          <div className="px-3 pt-2 pb-3 md:px-4 md:pt-2.5 md:pb-3">
            {/* Mismo ancho que la columna de mensajes — composer alineado al contenido */}
            <div className="relative max-w-3xl mx-auto">
              {paletteQuery !== null && (
                <CommandPalette
                  query={paletteQuery}
                  selectedIndex={paletteSelectedIndex}
                  onSelect={handleCommandSelect}
                  onClose={() => { setPaletteQuery(null); setPaletteSelectedIndex(0) }}
                />
              )}
              {showModelPicker && (
                <ModelPicker
                  onSelect={handleModelSelect}
                  onClose={() => setShowModelPicker(false)}
                />
              )}
              {showEffortPicker && (
                <EffortPicker
                  onSelect={handleEffortSelect}
                  onClose={() => setShowEffortPicker(false)}
                />
              )}

              {/* Pending images preview */}
              {pendingImages.length > 0 && (
                <div className="mb-2 flex flex-wrap items-start gap-2">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative inline-block">
                      <img
                        src={img.previewUrl}
                        alt={`Preview ${i + 1}`}
                        className="h-16 w-16 rounded-xl border border-border object-cover"
                      />
                      <button
                        onClick={() => removePendingImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-border-accent flex items-center justify-center text-foreground/75 hover:text-foreground hover:bg-red-500/80 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {pendingImages.length < MAX_IMAGES && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-16 w-16 rounded-xl border border-dashed border-border-accent flex items-center justify-center text-muted/70 hover:text-muted hover:border-border-accent transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                  {uploadingImage && (
                    <span className="text-[10px] text-primary animate-pulse self-center">Subiendo...</span>
                  )}
                </div>
              )}

              {hasUltrathink(input) && (
                <div className="mb-2 mr-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border border-primary/25 bg-gradient-to-r from-pink-500/10 via-primary/10 to-cyan-500/10 align-middle">
                  <span className="bg-gradient-to-r from-pink-400 via-violet-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent font-bold tracking-wider">
                    ULTRATHINK
                  </span>
                  <span className="text-muted">· thinking max activado</span>
                </div>
              )}

              {hasUltracodeWord(input) && (
                <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border border-brand/30 bg-brand/10 align-middle">
                  <span className="text-brand-ink font-bold tracking-wider">ULTRACODE</span>
                  <span className="text-muted">· orquestación multi-agente este turno</span>
                </div>
              )}

              {chatError && (
                <div className="mb-2 px-3 py-2 rounded-xl bg-error/10 border border-error/25 text-[12px] text-error flex items-center justify-between gap-3">
                  <span className="leading-snug">{chatError}</span>
                  <button
                    onClick={() => setChatError(null)}
                    className="shrink-0 text-error/60 hover:text-error transition-colors"
                    aria-label="Cerrar"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="msg-composer flex items-end gap-2.5 px-4 py-2
                focus-within:border-primary/30
                transition-all duration-300">
                {/* Image upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || loadingSession || uploadingImage}
                  title="Enviar imagen"
                  aria-label="Enviar imagen"
                  className="icon-btn shrink-0 size-9 md:size-8 !rounded-full disabled:opacity-30"
                >
                  <ImageIcon size={16} />
                </button>
                <div className="relative flex-1 min-w-0">
                  {/* Highlight overlay — only mounted when the user actually typed
                      a magic word. The ghost-overlay technique (transparent textarea
                      + visible div mirror) is the only way to color individual tokens
                      inside a textarea, but it has a hard tradeoff: when content
                      overflows max-h the textarea auto-scrolls to follow the caret
                      and the overlay can desync, leaving the caret floating over
                      empty space. We avoid that 99% of the time by keeping the
                      textarea fully visible unless we genuinely need the rainbow. */}
                  {showOverlay && (
                    <div
                      ref={overlayRef}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words text-[15px] md:text-sm leading-snug py-1 overflow-hidden"
                    >
                      <HighlightedInputOverlay value={input} />
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    // Región scrolleable propia: el textarea largo scrollea con
                    // el dedo (max-h 200px) y permite selección de texto en móvil.
                    // Exenta del preventDefault global de touchmove (dashboard-shell).
                    data-scroll-region
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onScroll={(e) => {
                      if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop
                    }}
                    placeholder={pendingImages.length > 0 ? 'Agrega un mensaje o envía...' : 'Mensaje...'}
                    rows={1}
                    disabled={loadingSession}
                    className="chat-input-scroll relative w-full bg-transparent text-[15px] md:text-sm placeholder:text-muted/50 resize-none outline-none min-h-[28px] max-h-[200px] leading-snug py-1 disabled:opacity-50"
                    style={showOverlay ? {
                      // Hide the textarea's own glyphs only while the rainbow overlay
                      // is mounted on top. Caret stays visible via caretColor.
                      color: 'transparent',
                      caretColor: 'var(--primary)',
                      WebkitTextFillColor: 'transparent',
                    } : { color: 'var(--foreground)' }}
                  />
                </div>
                {loading ? (
                  <button
                    onClick={stopStreaming}
                    title="Detener (Esc)"
                    aria-label="Detener respuesta"
                    className="msg-stop-btn shrink-0 w-9 h-9 md:w-8 md:h-8 active:scale-90"
                  >
                    {/* Cuadrito relleno estilo Claude — calmado, sin alarma */}
                    <span className="block w-[11px] h-[11px] md:w-[10px] md:h-[10px] rounded-[2.5px] bg-current" aria-hidden />
                  </button>
                ) : (input.trim() || pendingImages.length > 0) ? (
                  <button
                    onMouseDown={(e) => {
                      // Prevent textarea blur so the click fires immediately on desktop too
                      e.preventDefault()
                    }}
                    onTouchEnd={(e) => {
                      // On mobile Safari, tapping the send button while the keyboard is open
                      // causes a blur/reflow that swallows the first tap. By handling onTouchEnd
                      // and preventing default, we fire the send immediately on the first tap.
                      e.preventDefault()
                      handleSend()
                    }}
                    onClick={() => handleSend()}
                    disabled={loadingSession}
                    aria-label="Enviar mensaje"
                    className="msg-send-btn shrink-0 w-9 h-9 md:w-8 md:h-8 active:scale-90 disabled:opacity-40"
                  >
                    <ArrowUp size={17} strokeWidth={2.5} className="md:w-[15px] md:h-[15px]" />
                  </button>
                ) : (
                  <VoiceInput
                    onVoiceNote={handleVoiceNote}
                    disabled={loadingSession}
                  />
                )}
              </div>
            </div>
            <p className="hidden md:block text-[9px] text-muted/40 text-center mt-1.5 tracking-wide">
              Enter enviar · Shift+Enter nueva linea · Esc detener · / comandos
            </p>
          </div>
          <div className="safe-area-spacer shrink-0" />
        </div>
      </div>
    </div>
    </AudioProvider>
  )
}
