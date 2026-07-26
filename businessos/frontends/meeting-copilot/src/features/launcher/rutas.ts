/** Resuelve el placeholder [ultima] del catálogo a la última reunión analizada.
 *  Sin reunión analizada, la herramienta lleva a /reuniones (estado vacío honesto). */
export function resolverRutaHerramienta(ruta: string, ultimaReunionAnalizada: string | null): string {
  if (!ruta.includes('[ultima]')) return ruta
  if (!ultimaReunionAnalizada) return '/reuniones'
  return ruta.replace('[ultima]', ultimaReunionAnalizada)
}
