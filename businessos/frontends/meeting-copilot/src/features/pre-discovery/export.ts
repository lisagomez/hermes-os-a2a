// Exports puros del caso: brief en Markdown (para el asesor) y el JSON del
// Activo Digital (contrato del host-job de cosecha businessos/cosechar-prediscovery.py).

import type { CasoPreDiscovery, DatosBrief, Item } from './types'
import type { Lead } from '@/features/domain/types'
import type { ActivoDigitalLocal, CostoEntrada, ExportActivo } from '@/features/activos/types'
import { costoAcumulado } from '@/features/activos/store'

function listaMd(titulo: string, items: Item[]): string {
  if (items.length === 0) return ''
  return `\n## ${titulo}\n${items.map((i) => `- ${i.texto} _(${i.naturaleza})_`).join('\n')}\n`
}

export function briefAMarkdown(caso: CasoPreDiscovery, lead: Lead | null): string {
  const brief = caso.bloques.brief.datos as DatosBrief | null
  if (!brief) return `# Brief no disponible aún\n\nCorre el análisis del caso ${caso.id}.`
  return [
    `# Prep del asesor — ${lead?.empresa ?? caso.leadId}`,
    `Contacto: ${lead?.contacto ?? '—'} · Giro: ${caso.intake.giro} · ${caso.intake.pais}`,
    `\n> ${brief.resumen}`,
    listaMd('Ángulos de conversación', brief.angulos),
    listaMd('Hipótesis a validar', brief.hipotesis),
    listaMd('Riesgos a explorar', brief.riesgos),
    `\n## Preguntas recomendadas\n${brief.preguntasRecomendadas.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
    listaMd('Temas sensibles', brief.temasSensibles),
    `\n## Siguiente paso\n${brief.siguientePaso}`,
    `\n---\n_Generado por Pre-Discovery (Meeting Copilot); procedencia y confianza por bloque en la app._`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function construirExportActivo(activo: ActivoDigitalLocal, ledger: CostoEntrada[], contenido: unknown): ExportActivo {
  return {
    esquema: 'meeting-copilot/activo-export@1',
    exportadoAt: new Date().toISOString(),
    activo,
    costoAcumuladoUsd: costoAcumulado(ledger, activo.id),
    ledger: ledger.filter((c) => c.activoId === activo.id),
    contenido,
  }
}

export function descargarArchivo(nombre: string, contenido: string, mime: string): void {
  const blob = new Blob([contenido], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
