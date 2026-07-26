import { Card } from '@/shared/components/card'

/**
 * Skeleton compartido de las 5 vistas de (main): cards fantasma mientras las
 * páginas force-dynamic resuelven su fan-out (PostgREST + grafo + gateways).
 * Un solo archivo a nivel del grupo: todas las rutas hijas lo heredan, y el
 * ancho max-w-6xl ya lo pone el <main> del layout del grupo.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-surface" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-5 w-24 rounded bg-surface-muted" />
            <div className="mt-4 h-3 w-full rounded bg-surface-muted" />
            <div className="mt-2 h-3 w-2/3 rounded bg-surface-muted" />
          </Card>
        ))}
      </div>
      <Card className="animate-pulse">
        <div className="h-5 w-40 rounded bg-surface-muted" />
        <div className="mt-4 h-3 w-full rounded bg-surface-muted" />
        <div className="mt-2 h-3 w-5/6 rounded bg-surface-muted" />
        <div className="mt-2 h-3 w-3/4 rounded bg-surface-muted" />
      </Card>
    </div>
  )
}
