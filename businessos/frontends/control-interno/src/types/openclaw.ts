import { z } from 'zod'

// Coding tools that indicate real code work (from reference repo)
// "write" excluded — it's also used for markdown/docs
export const CODING_TOOLS = ['edit', 'exec', 'bash', 'run', 'process'] as const

// OpenClaw webhook event schema
export const openClawEventSchema = z.object({
  runId: z.string(),
  action: z.enum(['start', 'progress', 'end', 'error', 'document']),
  sessionKey: z.string().optional(),
  agentId: z.string().optional(), // id del agente emisor (ej. "main-agent")
  timestamp: z.string().optional(),
  error: z.string().optional(),
  prompt: z.string().optional(),
  source: z.string().optional(),
  message: z.string().optional(),
  response: z.string().optional(),
  // Cron silencioso: registra el run en conversations (historial input/output)
  // pero NO inyecta al chat Automatizaciones ni manda push.
  silent: z.boolean().optional(),
  // Costo/tokens del run — une jobId + costo en la fila de conversations
  // (sala Acciones del Artificial Brain). Lo manda el daemon al ejecutar un cron.
  usage: z.object({
    costUsd: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    durationMs: z.number(),
    numTurns: z.number(),
    model: z.string().optional(),
  }).optional(),
  eventType: z.string().optional(), // e.g. "tool:start", "lifecycle:start"
  document: z.object({
    title: z.string(),
    content: z.string(),
    type: z.string(),
    path: z.string().optional(),
  }).optional(),
})

export type OpenClawEvent = z.infer<typeof openClawEventSchema>
