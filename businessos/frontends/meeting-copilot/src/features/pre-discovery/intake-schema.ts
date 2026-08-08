// Esquema de validación del intake del lead. Vive en UN solo lugar: la ruta de
// análisis lo importa en vez de declarar el suyo. Un esquema paralelo que se
// quede corto no falla — DESPOJA campos en silencio y el analista trabaja con
// menos de lo que el usuario capturó (defecto real: "Holding" y la dirección se
// perdían y el modelo los reportaba como "no proporcionado").
//
// La anotación `z.ZodType<IntakeLead>` hace que el typecheck sea el guardián:
// si IntakeLead gana un campo y este esquema no, el build se pone rojo.

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
