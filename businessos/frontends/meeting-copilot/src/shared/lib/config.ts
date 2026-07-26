// Seams de configuración (SPEC §7). Regla del proyecto: un valor desconocido en
// un seam NO degrada en silencio — truena al cargar el módulo.

const FUENTES_DATOS = ['mock', 'real'] as const
const PROVIDERS_STT = ['mock', 'transcriptor-local', 'transcripcion-a2a', 'groq-whisper'] as const
const MOTORES_AGENTE = ['rules', 'llm'] as const

export type FuenteDatos = (typeof FUENTES_DATOS)[number]
export type ProviderSTT = (typeof PROVIDERS_STT)[number]
export type MotorAgente = (typeof MOTORES_AGENTE)[number]

function validar<T extends string>(nombre: string, valor: string | undefined, permitidos: readonly T[], fallback: T): T {
  if (valor === undefined || valor === '') return fallback
  if ((permitidos as readonly string[]).includes(valor)) return valor as T
  throw new Error(
    `${nombre}="${valor}" no es válido. Permitidos: ${permitidos.join(', ')}. ` +
      'Un seam mal configurado detiene la app en vez de degradar en silencio.'
  )
}

export const FUENTE_DATOS: FuenteDatos = validar(
  'NEXT_PUBLIC_COPILOT_DATA',
  process.env.NEXT_PUBLIC_COPILOT_DATA,
  FUENTES_DATOS,
  'mock'
)

export const PROVIDER_STT: ProviderSTT = validar(
  'NEXT_PUBLIC_TRANSCRIPTION_PROVIDER',
  process.env.NEXT_PUBLIC_TRANSCRIPTION_PROVIDER,
  PROVIDERS_STT,
  'mock'
)

export const MOTOR_AGENTE: MotorAgente = validar(
  'NEXT_PUBLIC_AGENT_ENGINE',
  process.env.NEXT_PUBLIC_AGENT_ENGINE,
  MOTORES_AGENTE,
  'rules'
)

if (FUENTE_DATOS === 'real') {
  throw new Error('NEXT_PUBLIC_COPILOT_DATA=real está reservado a la integración Supabase (post-MVP).')
}

// MOTOR_AGENTE='llm': la IA redacta la siguiente mejor pregunta con el contexto
// de la conversación (vía /api/asesor/pregunta, OPENROUTER_API_KEY server-side).
// El score/cobertura siguen siendo deterministas; sin clave o sin red, el
// Prompter cae al banco del playbook con aviso visible — nunca rompe el flujo.
