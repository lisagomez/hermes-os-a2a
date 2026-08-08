import { createHash } from 'node:crypto';

/**
 * Clave natural del origen web2: sha1 del email normalizado, prefijo compartido
 * con el chat (businessos/chat-web2/leads.py::lead_id_de_email). El MISMO humano
 * que charla y además llena el formulario debe quedar como UNA fila en `leads`
 * (RUNBOOK-PIPELINE-COMERCIAL.md P2) — por eso el prefijo es idéntico al del
 * chat y no uno propio del formulario.
 *
 * Vector de paridad con el lado Python (si cambias esto, cambia allá):
 *   leadIdDeEmail(' Ana@Ejemplo.Test ') === 'web2chat-' + sha1('ana@ejemplo.test')[:16]
 */
export function leadIdDeEmail(email: string): string {
  const h = createHash('sha1').update(email.trim().toLowerCase()).digest('hex').slice(0, 16);
  return `web2chat-${h}`;
}
