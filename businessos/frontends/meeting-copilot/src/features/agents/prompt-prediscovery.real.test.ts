// Smoke REAL del analista de Pre-Discovery: llama al modelo de verdad, por el
// MISMO camino que producción (analizarBloque), y exige que la salida pase el
// contrato de cada bloque. Los tests unitarios prueban que el prompt describe la
// forma; solo esto prueba que el modelo la obedece — que es lo que se rompió en
// producción (0/7 bloques).
//
// Corre el caso DIFÍCIL a propósito: con texto de sitio y con el contexto
// encadenado que recibe cada bloque. La primera versión de este smoke pasaba
// 7/7 sin texto de sitio mientras `sitio` seguía fallando en producción por
// truncamiento: un smoke que no ejercita el caso que falla no es un smoke.
//
// Gated (patrón EJECUTOR_SMOKE_REAL del repo): sin la env se salta, para que la
// suite siga siendo determinista y sin red.
//   PREDISCOVERY_SMOKE_REAL=1 OPENROUTER_API_KEY=… npx vitest run prompt-prediscovery.real
//
// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { ESQUEMAS_BLOQUE, type BloqueLLM } from './prompt-prediscovery'
import { analizarBloque } from './analista-prediscovery'
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
  notas:
    'Quiere una plataforma para gestionar el despacho con varias áreas: negociación, consultoría legal, ' +
    'consultoría financiera, ambiental, derecho corporativo, inmobiliario, fideicomisos y sucesiones, ' +
    'consultoría de negocios, contratos inteligentes y consultoría política.',
}

// Texto de sitio realista (~6 k caracteres es lo que el pipeline recorta): sin
// esto, el bloque `sitio` no llega al tamaño de respuesta que lo truncaba.
const TEXTO_SITIO = Array.from(
  { length: 60 },
  (_, i) =>
    `Área de práctica ${i + 1}: acompañamiento legal integral a empresas y familias, con experiencia en ` +
    `litigio, cumplimiento regulatorio, estructuras corporativas y atención personalizada a cada cliente.`
).join(' ')

describe.skipIf(!ACTIVO)('smoke real: el modelo obedece el contrato de cada bloque', () => {
  const previos: Partial<Record<BloqueLLM, unknown>> = {}

  for (const bloque of Object.keys(ESQUEMAS_BLOQUE) as BloqueLLM[]) {
    it(
      `${bloque} pasa el contrato con salida real del modelo`,
      async () => {
        const r = await analizarBloque(
          bloque,
          {
            intake: INTAKE,
            textoSitio: TEXTO_SITIO,
            perfilPrevio: bloque !== 'perfil' ? previos.perfil : undefined,
            competenciaPrevia: ['diferenciacion', 'foda', 'brief'].includes(bloque) ? previos.competencia : undefined,
            bloquesPrevios: bloque === 'brief' ? { foda: previos.foda, diferenciacion: previos.diferenciacion } : undefined,
          },
          { apiKey: process.env.OPENROUTER_API_KEY!, modelo: MODELO }
        )
        expect(r.ok, `${bloque}: ${r.ok ? '' : r.motivo}`).toBe(true)
        if (r.ok) previos[bloque] = r.datos
      },
      120_000
    )
  }
})
