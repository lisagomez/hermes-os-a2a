/**
 * AUTH_DISABLED=1 es el escape EXPLÍCITO para dev local / smokes mock-first
 * (sin Supabase) — patrón meeting-copilot (acceso.ts). Jamás se fija en
 * producción: en Vercel esta var no existe y el candado (middleware +
 * allowlist fail-closed) opera completo.
 */
export function authDeshabilitada(): boolean {
  return process.env.AUTH_DISABLED === '1'
}
