// Contratos zod de la superficie PÚBLICA de reserva. La ruta /reservar es la
// única sin auth: aquí viven los límites duros (max lengths, tamaño total)
// que valen tanto en el mock como cuando /api/reservar sea real.

import { z } from 'zod'

/** Tamaño máximo del payload de una solicitud (se rechaza ANTES de parsear). */
export const LIMITE_PAYLOAD_BYTES = 8 * 1024
/** Tamaño máximo del brief serializado (mini-form discovery). */
export const LIMITE_BRIEF_BYTES = 4 * 1024

export const esquemaRespuestaDiscovery = z.object({
  pregunta: z.string().min(1).max(200),
  respuesta: z.string().min(1).max(600),
})

export const esquemaSolicitudReserva = z
  .object({
    slug: z.string().min(1).max(80),
    asesorId: z.string().min(1).max(80),
    servicioId: z.string().max(80).nullable(),
    inicio: z.string().datetime({ offset: true }),
    cliente: z.object({
      nombre: z.string().min(1).max(120),
      email: z.string().email().max(160),
      telefono: z.string().min(7).max(20),
    }),
    sessionDepth: z.enum(['quick', 'discovery']),
    brief: z.array(esquemaRespuestaDiscovery).max(10).nullable(),
    token: z.string().max(120).nullable(),
  })
  .superRefine((s, ctx) => {
    // La profundidad manda sobre el brief: quick viaja sin brief; discovery lo exige.
    if (s.sessionDepth === 'quick' && s.brief !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['brief'], message: 'Una sesión quick no lleva brief.' })
    }
    if (s.sessionDepth === 'discovery' && (!s.brief || s.brief.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['brief'], message: 'Una sesión discovery exige brief no vacío.' })
    }
    if (s.brief && JSON.stringify(s.brief).length > LIMITE_BRIEF_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['brief'], message: `El brief excede ${LIMITE_BRIEF_BYTES} bytes.` })
    }
  })

export type SolicitudReservaValidada = z.infer<typeof esquemaSolicitudReserva>
