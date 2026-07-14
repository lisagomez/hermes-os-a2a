'use client'

import { Info } from 'lucide-react'

/**
 * Tooltip educativo inline. Hover en desktop, tap/focus en móvil.
 * Es el "profesor 80/20" hecho UI: cada término financiero se explica sin salir de la pantalla.
 */
export function InfoTip({ text, label }: { text: string; label?: string }) {
  return (
    <span className="relative inline-flex group align-middle">
      <button
        type="button"
        aria-label={label ?? 'Qué significa'}
        className="text-muted/50 hover:text-muted focus:text-muted outline-none transition-colors"
      >
        <Info size={11} className="cursor-help" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1.5 w-52 -translate-x-1/2 rounded-lg border border-border-subtle bg-card px-2.5 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal leading-snug text-foreground/90 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
