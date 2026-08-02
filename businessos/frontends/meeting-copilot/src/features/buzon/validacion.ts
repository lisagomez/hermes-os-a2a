// Validación con zod de los ÚNICOS puntos donde el humano teclea algo en el
// buzón: la política del buzón, la firma de riesgo (modo 'abierto') y el
// motivo de una decisión de A5. Todo lo demás es lectura o botones fijos.

import { z } from 'zod'

export const SchemaPoliticaBuzon = z.object({
  clasesPermitidas: z.array(z.string().trim().min(1)).min(1, 'Declara al menos una clase de correo permitida.'),
  cuotaHora: z.coerce.number().int().positive('La cuota por hora debe ser un entero positivo.'),
  cuotaHilo: z.coerce.number().int().positive('La cuota por hilo debe ser un entero positivo.'),
  aprobadorRol: z.enum(['PM', 'CEO', 'CFO']),
})

export type PoliticaBuzonInput = z.infer<typeof SchemaPoliticaBuzon>

export const SchemaFirmaRiesgo = z.object({
  riesgoFirmadoPor: z.string().trim().min(2, 'Indica quién asume el riesgo (nombre y rol).'),
  justificacion: z.string().trim().min(10, 'La justificación debe explicar por qué se acepta el modo abierto (mínimo 10 caracteres).'),
})

export type FirmaRiesgoInput = z.infer<typeof SchemaFirmaRiesgo>

/** Motivo de una decisión de A5. Rechazar y "Rechazar y reportar" lo exigen
 *  (nadie cierra un correo sin dejar por qué); Aprobar lo deja opcional. */
export const SchemaMotivoDecision = z.object({
  motivo: z.string().trim().min(5, 'Explica el motivo (mínimo 5 caracteres) — queda en la bitácora.'),
})
