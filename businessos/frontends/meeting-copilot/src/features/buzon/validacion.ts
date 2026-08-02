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

// ─── Asistente de configuración (§11) ───────────────────────────────────────

/** Pantalla 2 (§11.4): detección por MX a partir del correo del buzón. */
export const SchemaCorreoProveedor = z.object({
  correo: z.string().trim().email('Escribe una dirección de correo válida (p. ej. ventas@suempresa.com).'),
})

/** Pantalla 3 (§11.5): subdominio de envío editable. */
export const SchemaSubdominioEnvio = z.object({
  subdominio: z
    .string()
    .trim()
    .min(3, 'El subdominio es obligatorio.')
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, 'Usa un subdominio válido (p. ej. agentes.suempresa.com).'),
})

/** Pantalla 4 (§11.6): 3 correos de muestra para calibrar tono. Nunca se
 *  persisten más allá de la calibración (el store no los guarda). */
export const SchemaSemillaTono = z.object({
  correo1: z.string().trim().min(10, 'Pega un correo de ejemplo (mínimo 10 caracteres).'),
  correo2: z.string().trim().min(10, 'Pega un correo de ejemplo (mínimo 10 caracteres).'),
  correo3: z.string().trim().min(10, 'Pega un correo de ejemplo (mínimo 10 caracteres).'),
})

/** Pantalla 5 (§11.7): aprobador obligatorio (sin opción "nadie") + canal. Suplente opcional. */
export const SchemaAprobadorCanal = z.object({
  aprobador: z.string().trim().min(2, 'Elige quién aprueba los correos de este buzón.'),
  canalAprobacion: z.enum(['telegram', 'slack', 'panel']),
  aprobadorSuplente: z.string().trim().optional(),
})

/** Firma de activación (§11.1, §11.8): quién asume A5 al pasar de listo → activo. */
export const SchemaFirmaActivacion = z.object({
  activadoPor: z.string().trim().min(2, 'Indica quién firma la activación (nombre y rol).'),
})
