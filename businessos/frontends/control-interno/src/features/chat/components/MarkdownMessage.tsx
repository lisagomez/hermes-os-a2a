'use client'
import { useRef, useState, useCallback, useEffect, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark-dimmed.css'
import './hljs-override.css'
import { Copy, Check, X, ZoomIn, WrapText } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { MermaidDiagram } from './MermaidDiagram'

// ─── Code block with copy button ─────────────────────────────────────────────

function CodeBlock({ className, children }: ComponentPropsWithoutRef<'code'>) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  // Wrap por default (móvil-first: sin scroll horizontal anidado dentro del
  // scroll del chat). Toggle a scroll para código donde la indentación importa.
  const [wrap, setWrap] = useState(true)

  // Detección robusta de bloque vs inline. rehype-highlight NO siempre agrega
  // clase (fence sin lenguaje o sin auto-detect) — sin esto, un ``` pegado como
  // el bloque /goal caía al render inline SIN header/copiar/scroll (bug 7 jul).
  // Un salto de línea en el contenido = es un bloque, tenga clase o no.
  const raw = String(children ?? '')
  const isBlock = /language-|hljs/.test(className ?? '') || raw.includes('\n')

  if (!isBlock) {
    return (
      <code className="bg-card-active border border-border px-1.5 py-0.5 rounded text-[0.8em] font-mono text-foreground/85 break-all">
        {children}
      </code>
    )
  }

  if (/language-mermaid/.test(className ?? '')) {
    const code = String(children).replace(/\n$/, '')
    return <MermaidDiagram code={code} />
  }

  const language = (className ?? '').replace(/language-|hljs/g, '').trim()

  const handleCopy = () => {
    const text = preRef.current?.innerText ?? ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border bg-card">
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border-subtle">
        <span className="text-[10px] font-mono text-muted/80 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWrap((w) => !w)}
            className={`flex items-center gap-1 text-[10px] transition-colors ${wrap ? 'text-muted/80 hover:text-foreground/75' : 'text-brand-ink'}`}
            aria-pressed={!wrap}
            title={wrap ? 'Desactivar ajuste de línea' : 'Ajustar líneas'}
          >
            <WrapText size={11} />
            <span>{wrap ? 'Wrap' : 'Scroll'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-muted/80 hover:text-foreground/75 transition-colors"
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre ref={preRef} className={`px-4 py-3 text-xs leading-relaxed ${wrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto'}`}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

// ─── Pinch-to-zoom lightbox ──────────────────────────────────────────────────

export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const lastTouchRef = useRef<{ dist: number; x: number; y: number; scale: number; tx: number; ty: number } | null>(null)
  const lastTapRef = useRef(0)
  const imgRef = useRef<HTMLDivElement>(null)

  // Reset on mount
  useEffect(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [src])

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const getTouchDist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

  const getTouchCenter = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = getTouchDist(e.touches[0], e.touches[1])
      const center = getTouchCenter(e.touches[0], e.touches[1])
      lastTouchRef.current = { dist, x: center.x, y: center.y, scale, tx: translate.x, ty: translate.y }
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed
      lastTouchRef.current = { dist: 0, x: e.touches[0].clientX, y: e.touches[0].clientY, scale, tx: translate.x, ty: translate.y }
    }
  }, [scale, translate])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!lastTouchRef.current) return

    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = getTouchDist(e.touches[0], e.touches[1])
      const center = getTouchCenter(e.touches[0], e.touches[1])
      const ratio = dist / lastTouchRef.current.dist
      const newScale = Math.min(Math.max(lastTouchRef.current.scale * ratio, 1), 5)

      // Pan follows center of pinch
      const dx = center.x - lastTouchRef.current.x
      const dy = center.y - lastTouchRef.current.y

      setScale(newScale)
      setTranslate({
        x: lastTouchRef.current.tx + dx,
        y: lastTouchRef.current.ty + dy,
      })
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan with single finger when zoomed
      const dx = e.touches[0].clientX - lastTouchRef.current.x
      const dy = e.touches[0].clientY - lastTouchRef.current.y
      setTranslate({
        x: lastTouchRef.current.tx + dx,
        y: lastTouchRef.current.ty + dy,
      })
    }
  }, [scale])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      lastTouchRef.current = null

      // Snap back if scale near 1
      if (scale <= 1.05) {
        setScale(1)
        setTranslate({ x: 0, y: 0 })
      }
    }

    // Double-tap to zoom
    if (e.touches.length === 0 && e.changedTouches.length === 1) {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        if (scale > 1) {
          setScale(1)
          setTranslate({ x: 0, y: 0 })
        } else {
          setScale(2.5)
          // Center zoom on tap point
          const rect = imgRef.current?.getBoundingClientRect()
          if (rect) {
            const tapX = e.changedTouches[0].clientX
            const tapY = e.changedTouches[0].clientY
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            setTranslate({
              x: (centerX - tapX) * 1.5,
              y: (centerY - tapY) * 1.5,
            })
          }
        }
      }
      lastTapRef.current = now
    }
  }, [scale])

  // Mouse wheel zoom (desktop)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(scale * delta, 1), 5)
    if (newScale === 1) setTranslate({ x: 0, y: 0 })
    setScale(newScale)
  }, [scale])

  const handleBackdropClick = useCallback(() => {
    if (scale <= 1.05) onClose()
  }, [scale, onClose])

  const isZoomed = scale > 1.05

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-card border border-border-subtle text-foreground/75 hover:text-foreground hover:bg-card-active transition-all active:scale-90"
      >
        <X size={18} />
      </button>

      {/* Zoom hint */}
      {!isZoomed && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border-subtle text-muted text-[10px] pointer-events-none select-none">
          <ZoomIn size={12} />
          <span className="hidden md:inline">Scroll para zoom</span>
          <span className="md:hidden">Pellizca para zoom</span>
        </div>
      )}

      {/* Image container */}
      <div
        ref={imgRef}
        className="w-full h-full flex items-center justify-center"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="select-none"
          style={{
            maxWidth: '92vw',
            maxHeight: '88vh',
            objectFit: 'contain',
            borderRadius: '12px',
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: isZoomed ? 'none' : 'transform 0.2s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ─── Inline image with lightbox ──────────────────────────────────────────────

const ChatImage = memo(function ChatImage({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!src || error) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/60 border border-border-subtle text-muted/70 text-xs">
        <ZoomIn size={12} />
        {error ? 'Imagen no disponible' : 'Sin imagen'}
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group block my-2.5 rounded-2xl overflow-hidden border border-border hover:border-brand/30 transition-all duration-300 cursor-zoom-in relative shadow-lg shadow-black/20"
      >
        {/* Loading skeleton */}
        {!loaded && (
          <div className="w-full h-40 bg-card animate-pulse rounded-2xl" />
        )}
        <img
          src={src}
          alt={alt ?? 'image'}
          className={`max-w-full h-auto max-h-[300px] object-contain transition-all duration-300 group-hover:scale-[1.02] ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        {/* Hover overlay with zoom icon */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2.5">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 text-foreground/85 text-[10px]">
            <ZoomIn size={10} />
            Ampliar
          </span>
        </div>
      </button>

      {open && <ImageLightbox src={src} alt={alt ?? 'image'} onClose={() => setOpen(false)} />}
    </>
  )
}, (prev, next) => prev.src === next.src && prev.alt === next.alt)

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Thinking toggle (collapsed by default) ─────────────────────────────────

export function ThinkingBlock({
  text,
  label,
  streaming = false,
}: {
  text: string
  label?: string
  streaming?: boolean
}) {
  const [open, setOpen] = useState(false)
  const isWaiting = streaming && !text
  // "Pensando…" mientras trabaja (actividad obvia de un vistazo, sin expandir);
  // "Pensamiento" cuando terminó. En español — la app habla español.
  const shownLabel = label ?? (streaming ? 'Pensando' : 'Pensamiento')
  return (
    // font-sans: el thinking es UI chrome — no hereda la serif editorial del cuerpo.
    // aria-hidden: iOS Speak Screen no debe leer el pensamiento, solo la respuesta.
    <div aria-hidden className="mb-2 font-sans text-[15px]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted/80 italic hover:text-muted transition-colors"
      >
        <span>{open ? '▾' : '▸'} {shownLabel}</span>
        {streaming && (
          <span className="inline-flex items-center gap-0.5">
            <span className="w-1 h-1 rounded-full bg-muted/60 animate-pulse" />
            <span className="w-1 h-1 rounded-full bg-muted/60 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-muted/60 animate-pulse" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </button>
      {open && (
        <div className="mt-1 pl-3 border-l border-border-subtle text-[11px] text-muted/80 leading-relaxed whitespace-pre-wrap italic">
          {text || (isWaiting ? <span className="opacity-60">esperando primer token…</span> : null)}
        </div>
      )}
    </div>
  )
}

/**
 * Devuelve SOLO el texto de la respuesta: quita los bloques de pensamiento
 * (<!--thinking-->…<!--/thinking-->) y otros marcadores internos (<details>),
 * colapsando saltos de línea sobrantes. Se usa para COPIAR / TTS / LECTOR —
 * donde el pensamiento NUNCA debe ir.
 *
 * En sesiones nativas de la app el `content` ya viene limpio (thinking vive en
 * `msg.thinking` aparte) → no-op. En sesiones CLI (`sdk:`) recargadas desde
 * historial, useChatHistory funde el thinking en `content` con esos marcadores
 * (por eso CopyBtn/AudioButton/ReaderBtn lo arrastraban): esto lo separa igual
 * que el render visual de MarkdownMessage.
 */
export function stripThinking(content: string): string {
  return content
    .replace(/<!--thinking-->[\s\S]*?<!--\/thinking-->/g, '')
    .replace(/<details>[\s\S]*?<\/details>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  // Extract thinking blocks into separate components, render rest as markdown
  const thinkingRegex = /<!--thinking-->([\s\S]*?)<!--\/thinking-->/g
  const segments: Array<{ type: 'thinking' | 'text'; content: string }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = thinkingRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'thinking', content: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }

  // Clean text segments (strip other internal markers)
  const cleanedSegments = segments.map((s) => {
    if (s.type !== 'text') return s
    const cleaned = s.content
      .replace(/<details>[\s\S]*?<\/details>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return { ...s, content: cleaned }
  }).filter((s) => s.content)

  if (cleanedSegments.length === 0) return null

  return (
    // Serif editorial del sistema (.chat-serif, 17px) sobre columna centrada
    // (~48rem) = el feel de lectura de Claude iOS. Código/tools siguen en mono/sans.
    <div className="markdown-message chat-serif min-w-0">
      {cleanedSegments.map((seg, i) =>
        seg.type === 'thinking' ? (
          <ThinkingBlock key={i} text={seg.content} />
        ) : (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
          code: CodeBlock,
          // CodeBlock ya emite su propio <pre> con header + copiar. Sin este
          // passthrough, react-markdown envuelve TODO en otro <pre> (doble caja
          // y layout roto). Aquí el <pre> del markdown solo deja pasar a su hijo.
          pre: ({ children }) => <>{children}</>,
          p: ({ children }) => (
            <p className="mb-1 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
          ),
          h1: ({ children }) => <h1 className="text-[22px] font-bold text-foreground mt-4 mb-1.5 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[19px] font-semibold text-foreground mt-3.5 mb-1 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[17px] font-semibold text-foreground/85 mt-3 mb-0.5 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="mb-1 pl-4 space-y-px list-disc list-outside">{children}</ul>,
          ol: ({ children }) => <ol className="mb-1 pl-4 space-y-px list-decimal list-outside">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-1.5 pl-3 border-l-2 border-border text-foreground/70 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-border" />,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="text-foreground/75 italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-ink hover:opacity-80 underline underline-offset-2 transition-opacity"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => <ChatImage src={typeof src === 'string' ? src : undefined} alt={typeof alt === 'string' ? alt : undefined} />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-foreground/70 border-b border-border bg-card">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border-subtle text-foreground/85">{children}</td>
          ),
        }}
      >
        {seg.content}
      </ReactMarkdown>
        )
      )}
    </div>
  )
})
