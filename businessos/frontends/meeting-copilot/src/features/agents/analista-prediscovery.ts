// Llamada al modelo para UN bloque de Pre-Discovery. Vive aquí, y no dentro de
// la ruta, para que el smoke real (prompt-prediscovery.real.test.ts) ejercite
// EXACTAMENTE el camino de producción: mismo tope de tokens, misma extracción de
// JSON y el mismo reintento. Un smoke que reimplementa el camino no prueba el
// camino — el primero que se escribió pasaba 7/7 mientras producción fallaba.

import { SYSTEM_PREDISCOVERY, construirUsuarioBloque, validarBloqueIA, type BloqueLLM, type ContextoAnalisis } from './prompt-prediscovery'

// El bloque `sitio` necesitó 2.646 tokens de salida con un sitio real: con el
// tope viejo de 1.600 la respuesta salía CORTADA (`finish_reason: length`) y el
// JSON incompleto se reportaba como "el modelo no devolvió JSON válido", que
// apunta al lugar equivocado. El tope solo acota; se paga lo generado.
//
// Honestidad sobre cuánto pesa este número: al bajarlo de vuelta a 1.600 el
// smoke real SIGUIÓ pasando 7/7 — el reintento de abajo rescataba las corridas
// truncadas. O sea, quien sostiene la fiabilidad es el reintento; este tope
// evita pagar intentos completos que se tiran a la basura (y la latencia de
// repetirlos).
export const MAX_TOKENS = 4000
export const TIMEOUT_MS = 60_000

interface RespuestaModelo {
  choices?: { message?: { content?: string }; finish_reason?: string }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

export function extraerJson(contenido: string): unknown {
  try {
    return JSON.parse(contenido)
  } catch {
    const m = contenido.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0])
    } catch {
      return null
    }
  }
}

export type ResultadoAnalisis =
  | { ok: true; datos: unknown; degradados: number; tokensIn: number; tokensOut: number; reintentos: number }
  | { ok: false; motivo: string; estado: number; tokensIn: number; tokensOut: number }

/** Pide un bloque al modelo y lo exige contra su contrato. Cumplirlo es
 *  probabilístico: se admite UNA corrección con el motivo exacto de vuelta al
 *  modelo. Si a la segunda no cumple, quien llama decide (el pipeline cae al
 *  mock declarado). Ningún intento perdido queda mudo: todos se loguean. */
export async function analizarBloque(
  bloque: BloqueLLM,
  contexto: ContextoAnalisis,
  opciones: { apiKey: string; modelo: string; signal?: AbortSignal }
): Promise<ResultadoAnalisis> {
  const usuarioBase = construirUsuarioBloque(bloque, contexto)
  let tokensIn = 0
  let tokensOut = 0
  let ultimoMotivo = ''

  for (let intento = 0; intento < 2; intento++) {
    const mensajes: { role: string; content: string }[] = [
      { role: 'system', content: SYSTEM_PREDISCOVERY },
      { role: 'user', content: usuarioBase },
    ]
    if (intento > 0) {
      mensajes.push({
        role: 'user',
        content: `Tu respuesta anterior NO se pudo usar: ${ultimoMotivo}. Devuelve de nuevo SOLO el JSON, con la forma exacta ya indicada y sin envolverlo en ninguna clave.`,
      })
    }

    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: opciones.signal,
      headers: { Authorization: `Bearer ${opciones.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: opciones.modelo, temperature: 0.3, max_tokens: MAX_TOKENS, messages: mensajes }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      return {
        ok: false,
        estado: 502,
        motivo: `OpenRouter respondió ${respuesta.status}: ${detalle.slice(0, 160)}`,
        tokensIn,
        tokensOut,
      }
    }

    const data = (await respuesta.json()) as RespuestaModelo
    tokensIn += data.usage?.prompt_tokens ?? 0
    tokensOut += data.usage?.completion_tokens ?? 0
    const eleccion = data.choices?.[0]
    const crudo = extraerJson(eleccion?.message?.content ?? '')

    if (crudo === null) {
      // Un corte por tope de tokens NO es "JSON inválido": decirlo mal manda a
      // depurar el prompt cuando el problema es el tamaño de la respuesta.
      ultimoMotivo =
        eleccion?.finish_reason === 'length'
          ? `la respuesta se cortó por el tope de ${MAX_TOKENS} tokens (JSON incompleto)`
          : 'no devolviste JSON parseable'
    } else {
      const validado = validarBloqueIA(bloque, crudo)
      if (validado) {
        return { ok: true, datos: validado.datos, degradados: validado.degradados, tokensIn, tokensOut, reintentos: intento }
      }
      const claves = Object.keys(crudo as object)
      ultimoMotivo = `no cumple el contrato del bloque "${bloque}" (claves recibidas: ${claves.slice(0, 8).join(', ') || 'ninguna'})`
    }
    console.warn(`[pre-discovery/${bloque}] intento ${intento + 1} descartado: ${ultimoMotivo}`)
  }

  return { ok: false, estado: 502, motivo: `El modelo ${ultimoMotivo}.`, tokensIn, tokensOut }
}
