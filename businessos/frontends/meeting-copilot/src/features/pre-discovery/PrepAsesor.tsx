'use client'

// "Prep del asesor": tarjeta compacta del brief de Pre-Discovery, embebida en
// el Prompter (modo asesor) y en Guided Meeting. Misma fuente que el caso —
// cero lógica nueva, solo presentación para consumo en vivo.

import Link from 'next/link'
import { Radar } from 'lucide-react'
import type { CasoPreDiscovery, DatosBrief } from './types'
import { Card, Chip } from '@/shared/components/ui'

/** Resumen compacto del brief para inyectar al redactor de preguntas IA. */
export function briefCompacto(caso: CasoPreDiscovery | null): string | null {
  const brief = caso?.bloques.brief.datos as DatosBrief | null
  if (!brief) return null
  return [
    `Resumen: ${brief.resumen}`,
    brief.hipotesis.length > 0 ? `Hipótesis a validar: ${brief.hipotesis.map((h) => h.texto).join(' · ')}` : null,
    brief.temasSensibles.length > 0 ? `Temas sensibles: ${brief.temasSensibles.map((t) => t.texto).join(' · ')}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function PrepAsesorCard({ caso }: { caso: CasoPreDiscovery }) {
  const brief = caso.bloques.brief.datos as DatosBrief | null
  if (!brief) {
    return (
      <Card className="p-3">
        <p className="text-[12px] text-ink-secondary">
          El lead tiene caso de Pre-Discovery pero el brief aún no corre —{' '}
          <Link href={`/pre-discovery/${caso.id}`} className="font-medium text-accent hover:underline">
            ábrelo y analiza
          </Link>
          .
        </p>
      </Card>
    )
  }
  return (
    <Card className="p-3" data-testid="prep-asesor">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Radar className="h-3.5 w-3.5 text-accent" />
        <p className="text-[12px] font-semibold text-ink">Prep del asesor (Pre-Discovery)</p>
        <Chip tono="accent">brief</Chip>
      </div>
      <p className="text-[12px] leading-snug text-ink">{brief.resumen}</p>
      {brief.hipotesis.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Hipótesis a validar</p>
          <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-[12px] text-ink">
            {brief.hipotesis.slice(0, 3).map((h) => (
              <li key={h.texto}>{h.texto}</li>
            ))}
          </ul>
        </div>
      )}
      {brief.temasSensibles.length > 0 && (
        <p className="mt-1.5 text-[11px] text-warning">⚠ {brief.temasSensibles[0].texto}</p>
      )}
      <Link href={`/pre-discovery/${caso.id}?tab=brief`} className="mt-1.5 block text-[11px] font-medium text-accent hover:underline">
        Ver brief completo →
      </Link>
    </Card>
  )
}
