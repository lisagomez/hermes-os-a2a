// Rutas de pantalla completa (sin sidebar/topbar/launcher), extraídas como
// predicado PURO para testearlo con vitest — patrón acceso.ts.
// /login: página de auth. /reservar: superficie pública del CLIENTE (mobile-first);
// jamás debe ver la shell interna del copiloto.

export const RUTAS_SIN_SHELL = ['/login', '/reservar']

export function esRutaSinShell(pathname: string): boolean {
  return RUTAS_SIN_SHELL.some((r) => pathname === r || pathname.startsWith(r + '/'))
}
