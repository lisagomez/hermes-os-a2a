'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { markdownToPlainText } from '@/lib/markdown-to-plaintext'

/**
 * Vista de lectura aislada para iOS Speak Screen / "Abrir lector".
 *
 * Renderiza SOLO el texto de un mensaje en un overlay full-screen y, mientras
 * está abierto, marca todo lo demás del body como inert + aria-hidden: el
 * árbol de accesibilidad queda reducido a este texto, así el lector de iOS
 * no puede leer otra cosa (sidebar, tools, composer — nada existe para él).
 */
export function ReaderOverlay({ content, onClose }: { content: string; onClose: () => void }) {
  const [container] = useState(() =>
    typeof document !== 'undefined' ? document.createElement('div') : null
  )

  useEffect(() => {
    if (!container) return
    document.body.appendChild(container)

    // Silenciar el resto de la app SOLO mientras el lector está abierto.
    // Se filtran los que ya traían inert para no quitárselo al restaurar.
    const others = Array.from(document.body.children).filter(
      (el) => el !== container && el.tagName !== 'SCRIPT' && !el.hasAttribute('inert')
    )
    others.forEach((el) => {
      el.setAttribute('inert', '')
      el.setAttribute('aria-hidden', 'true')
    })

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)

    return () => {
      others.forEach((el) => {
        el.removeAttribute('inert')
        el.removeAttribute('aria-hidden')
      })
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      document.body.removeChild(container)
    }
  }, [container, onClose])

  if (!container) return null

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-background overflow-y-auto overscroll-contain">
      {/* Chrome mínimo, oculto al lector — solo el texto es contenido */}
      <div
        aria-hidden
        className="sticky top-0 z-10 flex justify-end px-3 pb-1 bg-background/85 backdrop-blur-md"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      >
        <button
          onClick={onClose}
          title="Cerrar lector"
          className="flex items-center justify-center size-9 rounded-full bg-card border border-border text-muted hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      {/* UN SOLO nodo de texto plano (no markdown fragmentado): el screen reader
          de iOS selecciona/lee TODA la respuesta de un tirón. whitespace-pre-wrap
          conserva los párrafos sin romper la atomicidad de la selección. */}
      <article className="max-w-2xl mx-auto px-5 pb-24 text-[17px] leading-relaxed">
        <div className="whitespace-pre-wrap break-words">{markdownToPlainText(content)}</div>
      </article>
    </div>,
    container
  )
}
