// Prompt del agente "Meeting Coach — redacción de pregunta" (motor llm).
// PURO y testeable: la división de responsabilidades es deliberada — el motor
// determinista decide QUÉ dimensión falta (explicable, testeado); la IA solo
// REDACTA la pregunta enganchada al contexto real de la conversación.

export interface ContextoPregunta {
  dimension: string
  motivo: string
  preguntaBanco: string
  tipoReunion: string
  leadNombre: string | null
  contexto: { hablante: string; texto: string }[]
  preguntasPrevias: string[]
}

export const SYSTEM_PREGUNTA = `Eres el coach de un vendedor profesional estratégico durante una entrevista de discovery EN CURSO (español de México). Trabajas SOLO con la transcripción provista — jamás inventes datos que no estén ahí.

Tu única tarea: redactar UNA pregunta abierta, natural y breve para cubrir la dimensión faltante que se te indica.

Reglas:
- Si la transcripción menciona algo relevante a la dimensión, engánchate a ello (parafraséalo en pocas palabras); si no, adapta la pregunta genérica del playbook al tono de la conversación.
- No repitas preguntas ya sugeridas ni preguntes lo que el cliente ya respondió.
- Tono profesional cercano (tuteo suave), sin tecnicismos de venta.
- Responde SOLO un objeto JSON válido: {"pregunta": "...", "justificacion": "..."} donde justificacion es UNA línea que explica por qué esa pregunta ahora, citando el contexto si lo usaste.`

export function construirUsuarioPregunta(c: ContextoPregunta): string {
  const lineas = c.contexto.map((s) => `${s.hablante}: ${s.texto}`).join('\n')
  return [
    `Tipo de reunión: ${c.tipoReunion}.`,
    c.leadNombre ? `Lead entrevistado: ${c.leadNombre}.` : null,
    `Dimensión faltante a cubrir: ${c.dimension} — ${c.motivo}`,
    `Pregunta genérica del playbook (mejórala con el contexto): "${c.preguntaBanco}"`,
    c.preguntasPrevias.length > 0 ? `Preguntas ya sugeridas (NO repetir): ${c.preguntasPrevias.map((q) => `"${q}"`).join(', ')}` : null,
    '',
    'Transcripción reciente de la conversación:',
    lineas.length > 0 ? lineas : '(aún no hay conversación: es la pregunta de apertura)',
  ]
    .filter((x): x is string => x !== null)
    .join('\n')
}

/** Parseo defensivo de la respuesta del modelo (JSON directo o embebido). */
export function parsearRespuestaPregunta(texto: string): { pregunta: string; justificacion: string } | null {
  const intento = (s: string) => {
    try {
      const obj = JSON.parse(s) as { pregunta?: unknown; justificacion?: unknown }
      if (typeof obj.pregunta === 'string' && obj.pregunta.trim().length > 0) {
        return {
          pregunta: obj.pregunta.trim(),
          justificacion: typeof obj.justificacion === 'string' ? obj.justificacion.trim() : '',
        }
      }
    } catch {
      /* sigue el siguiente intento */
    }
    return null
  }
  const directo = intento(texto)
  if (directo) return directo
  const m = texto.match(/\{[\s\S]*\}/)
  return m ? intento(m[0]) : null
}
