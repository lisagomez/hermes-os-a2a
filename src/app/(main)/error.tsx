'use client'

import { Card } from '@/shared/components/card'

/**
 * Error boundary compartido de las 5 vistas de (main). Tono honesto del
 * panel: dice qué falló sin inventar la causa y ofrece reintentar. Debe ser
 * client component (contrato de error.tsx en App Router).
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm font-medium text-danger">
        <span aria-hidden>✕</span> No se pudieron cargar los datos del panel
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        Falló alguna de las fuentes (Supabase, grafo o gateways). Reintenta;
        si persiste, revisa los servicios.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-ink-muted">ref: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
      >
        Reintentar
      </button>
    </Card>
  )
}
