// Esquema de validación del intake del lead. Vive en UN solo lugar: la ruta de
// análisis lo importa en vez de declarar el suyo. Un esquema paralelo que se
// quede corto no falla — DESPOJA campos en silencio y el analista trabaja con
// menos de lo que el usuario capturó (defecto real: "Holding" y la dirección se
// perdían y el modelo los reportaba como "no proporcionado").
//
// Ojo: la anotación `z.ZodType<IntakeLead>` NO alcanza como guardián — se
// comprobó quitando `linkedin` y el typecheck pasó igual (TS no exige que el
// esquema cubra los campos opcionales del tipo). Quien defiende esto es el test
// de intake-schema.test.ts que compara las claves de entrada y salida.

import { z } from 'zod'
import type { IntakeLead } from './types'

export const IntakeSchema: z.ZodType<IntakeLead> = z.object({
  telefono: z.string(),
  email: z.string(),
  linkedin: z.string().optional(),
  web: z.string(),
  tamano: z.string(),
  modeloNegocio: z.string().optional(),
  giro: z.string().min(2),
  pais: z.string(),
  direccion: z.string().optional(),
  notas: z.string(),
})
