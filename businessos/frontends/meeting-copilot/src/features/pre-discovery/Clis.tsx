'use client'

// CLIs aplicables del caso — doctrina Printing Press del repo: imprimir un CLI
// es un acto humano en Claude Code (/printing-press); la app JAMÁS finge
// imprimir binarios. Aquí van comandos COPIABLES reales que operan el caso hoy,
// más los comandos de impresión/cosecha que el humano corre donde corresponde.

import { useState } from 'react'
import { Check, ClipboardCopy, TerminalSquare } from 'lucide-react'
import type { CasoPreDiscovery } from './types'
import type { ActivoDigitalLocal } from '@/features/activos/types'
import { Card, Chip, SectionHeader } from '@/shared/components/ui'

function Comando({ titulo, comando, nota }: { titulo: string; comando: string; nota?: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <Card className="p-3" data-testid="cli-comando">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-ink">{titulo}</p>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-[11px]"
          onClick={() => {
            void navigator.clipboard.writeText(comando).then(() => {
              setCopiado(true)
              setTimeout(() => setCopiado(false), 1500)
            })
          }}
        >
          {copiado ? <Check className="h-3 w-3 text-success" /> : <ClipboardCopy className="h-3 w-3" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-s bg-surface-muted p-2 font-mono text-[11px] leading-relaxed text-ink">{comando}</pre>
      {nota && <p className="mt-1 text-[11px] text-ink-muted">{nota}</p>}
    </Card>
  )
}

export function Clis({ caso, activo }: { caso: CasoPreDiscovery; activo: ActivoDigitalLocal | null }) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://meeting-copilot-pi.vercel.app'
  const intakeJson = JSON.stringify({ bloque: 'foda', intake: caso.intake }).replaceAll("'", "\\'")

  return (
    <div className="space-y-3">
      <SectionHeader
        titulo="CLIs y comandos aplicables"
        descripcion="Comandos reales para operar este caso desde terminal o agentes. Imprimir CLIs binarios es un acto humano en Claude Code (doctrina Printing Press) — aquí nada se finge."
      />

      <Comando
        titulo="Regenerar un bloque del análisis (API real, requiere AGENT_ENGINE=llm en el server)"
        comando={`curl -s ${base}/api/pre-discovery/analizar \\\n  -H 'Content-Type: application/json' \\\n  -d '${intakeJson}'`}
        nota="Cambia el campo bloque por: perfil | sitio | competencia | diferenciacion | foda | tecnologia | brief."
      />

      <Comando
        titulo="Leer el sitio del lead (fetch normalizado)"
        comando={`curl -s ${base}/api/pre-discovery/sitio -H 'Content-Type: application/json' -d '{"url": "${caso.intake.web || 'https://ejemplo.com'}"}'`}
      />

      <Comando
        titulo="Consultar el grafo regulatorio (contrato real POST /evaluaciones)"
        comando={`curl -s $GRAFO_URL/evaluaciones -H 'Content-Type: application/json' \\\n  -d '{"contexto": {"dimension": "regulatorio", "regimen": "GENERAL"}, "conceptos": [{"descripcion": "Operación de ${caso.intake.giro}"}]}'`}
        nota="GRAFO_URL vive en hermes-net/loopback del servidor (http://grafo:3000 · http://127.0.0.1:3000). Sin acceso, la app usa el mock fiel."
      />

      {activo && (
        <Comando
          titulo="Cosechar este activo al ERP (host-job, corre en la máquina con credenciales cli_fin)"
          comando={`python3 businessos/cosechar-prediscovery.py ~/Descargas/${activo.folio}.json --dry-run\n# revisar el SQL propuesto y luego:\npython3 businessos/cosechar-prediscovery.py ~/Descargas/${activo.folio}.json --confirmar`}
          nota={`Primero exporta el JSON desde la pestaña Activo & Costeo (${activo.folio}.json). El job registra en erp.act_activo/act_version/act_costo con SET ROLE — jamás service_role.`}
        />
      )}

      <Comando
        titulo="Imprimir el CLI del grafo (pendiente en cli-manifest.yaml; humano en Claude Code)"
        comando={`/printing-press http://grafo:3000/openapi.json codex`}
        nota="El CLI del grafo está declarado como pendiente de imprimir en businessos/cli-manifest.yaml (fase 2, source: own)."
      />

      <div className="flex items-center gap-2 pt-1">
        <TerminalSquare className="h-3.5 w-3.5 text-ink-muted" />
        <Chip>Meeting Copilot declarado en cli-manifest.yaml para impresión futura (source: sniff)</Chip>
      </div>
    </div>
  )
}
