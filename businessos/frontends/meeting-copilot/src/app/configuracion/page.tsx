'use client'

import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { Card, Chip, SectionHeader } from '@/shared/components/ui'
import { FUENTE_DATOS, MOTOR_AGENTE, PROVIDER_STT } from '@/shared/lib/config'
import { useTheme } from '@/shared/contexts/theme-context'

export default function Page() {
  const { theme, resolvedTheme } = useTheme()
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionHeader titulo="Configuración" descripcion="Preferencias de la shell y estado de los seams del sistema." />

      <Card className="flex items-center justify-between p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Tema</h2>
          <p className="text-[12px] text-ink-secondary">
            Modo actual: <span className="font-medium">{theme}</span> (resuelto: {resolvedTheme}). “Sistema” sigue a
            <code className="mx-1 rounded bg-surface-muted px-1">prefers-color-scheme</code>.
          </p>
        </div>
        <ThemeToggle />
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-ink">Seams (integraciones pluggables)</h2>
        <p className="text-[12px] text-ink-secondary">
          Cada capa externa entra por una variable de entorno validada al arrancar — un valor desconocido detiene la app
          en vez de degradar en silencio.
        </p>
        <ul className="space-y-2 text-[13px]">
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
            <span className="text-ink">Fuente de datos <code className="ml-1 text-[11px] text-ink-muted">NEXT_PUBLIC_COPILOT_DATA</code></span>
            <Chip tono="info">{FUENTE_DATOS}</Chip>
          </li>
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
            <span className="text-ink">Provider de transcripción <code className="ml-1 text-[11px] text-ink-muted">NEXT_PUBLIC_TRANSCRIPTION_PROVIDER</code></span>
            <Chip tono="info">{PROVIDER_STT}</Chip>
          </li>
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
            <span className="text-ink">Motor de agentes <code className="ml-1 text-[11px] text-ink-muted">NEXT_PUBLIC_AGENT_ENGINE</code></span>
            <Chip tono="info">{MOTOR_AGENTE}</Chip>
          </li>
        </ul>
        <p className="text-[12px] text-ink-muted">
          Providers diseñados: mock (activo) · transcriptor-local (faster-whisper vía Flask) · transcripcion-a2a (servicio
          A2A :4800) · groq-whisper. Motor de agentes: rules (activo) · llm (contratos listos).
        </p>
      </Card>
    </div>
  )
}
