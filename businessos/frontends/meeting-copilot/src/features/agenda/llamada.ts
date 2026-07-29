// Handoff de llamada (M4): helpers PUROS y testeables. Hoy el handoff real es
// tel:/wa.me desde el dispositivo del asesor; la herramienta integrada de
// llamadas está declarada 'soon' en el catálogo (seam: /llamadas?cita=<id>).

/** Normaliza a E.164 sin '+' (convención wa_id de la casa: leads.telefono).
 *  Números de 10 dígitos se asumen MX (lada 52). Devuelve '' si no es usable. */
export function normalizarE164(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length < 7 || digitos.length > 15) return ''
  if (digitos.length === 10) return `52${digitos}`
  return digitos
}

export function construirHandoffLlamada(telefono: string): { tel: string; whatsapp: string } | null {
  const e164 = normalizarE164(telefono)
  if (!e164) return null
  return { tel: `tel:+${e164}`, whatsapp: `https://wa.me/${e164}` }
}
