// Smoke REAL del analista de Pre-Discovery: llama al modelo de verdad y exige
// que la salida pase el contrato de CADA bloque. Los tests unitarios prueban
// que el prompt describe la forma; solo esto prueba que el modelo la obedece —
// que es exactamente lo que se rompió en producción (0/7 bloques, 3 intentos).
//
// Gated (patrón EJECUTOR_SMOKE_REAL del repo): sin la env se salta, para que la
// suite siga siendo determinista y sin red.
//   PREDISCOVERY_SMOKE_REAL=1 OPENROUTER_API_KEY=… npx vitest run prompt-prediscovery.real
//
// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { ESQUEMAS_BLOQUE, SYSTEM_PREDISCOVERY, construirUsuarioBloque, validarBloqueIA, type BloqueLLM } from './prompt-prediscovery'
import type { IntakeLead } from '@/features/pre-discovery/types'

const ACTIVO = process.env.PREDISCOVERY_SMOKE_REAL === '1' && !!process.env.OPENROUTER_API_KEY
const MODELO = process.env.ASESOR_LLM_MODEL ?? 'google/gemini-2.5-flash-lite'

const INTAKE: IntakeLead = {
  telefono: '+52 55 0000 0000',
  email: 'contacto@despacho.example',
  linkedin: 'linkedin.com/in/contacto-ejemplo',
  web: 'https://despacho.example/',
  tamano: '11-50',
  modeloNegocio: 'Holding',
  giro: 'Legal',
  pais: 'México (MX)',
  direccion: 'Hipódromo Condesa, CDMX',
  notas: 'Quiere una plataforma para gestionar el despacho con varias áreas de práctica.',
}

async function pedirBloque(bloque: BloqueLLM): Promise<unknown> {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0.3,
      max_tokens: 1600,
      messages: [
        { role: 'system', content: SYSTEM_PREDISCOVERY },
        { role: 'user', content: construirUsuarioBloque(bloque, { intake: INTAKE }) },
      ],
    }),
  })
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] }
  const contenido = data.choices?.[0]?.message?.content ?? ''
  try {
    return JSON.parse(contenido)
  } catch {
    const m = contenido.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : null
  }
}

describe.skipIf(!ACTIVO)('smoke real: el modelo obedece el contrato de cada bloque', () => {
  for (const bloque of Object.keys(ESQUEMAS_BLOQUE) as BloqueLLM[]) {
    it(
      `${bloque} pasa validarBloqueIA con salida real del modelo`,
      async () => {
        const crudo = await pedirBloque(bloque)
        expect(crudo, `${bloque}: el modelo no devolvió JSON`).not.toBeNull()
        // La clave del fallo original: la salida venía envuelta en {"<bloque>": …}.
        expect(Object.keys(crudo as object), `${bloque}: salida envuelta`).not.toEqual([bloque])
        expect(validarBloqueIA(bloque, crudo), `${bloque}: no cumple el contrato`).not.toBeNull()
      },
      60_000
    )
  }
})
