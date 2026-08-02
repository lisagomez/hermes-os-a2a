// Árbol de navegación de Meeting Copilot (config, no JSX) + identidad en el
// ecosistema. Schema/funciones: src/shared/app-registry (vendored). Los nodos
// ocultoEnSidebar (detalles con :id) solo existen para el breadcrumb.
// Configuración queda en el footer del sidebar, fuera del árbol (como siempre).

import type { NavArbol } from '@/shared/app-registry/nav'

export const APP_ID = 'meeting-copilot'

// OVERRIDES_URL vive en LanzadorEcosistema.tsx (chunk lazy), NO aquí: este
// módulo entra al bundle del layout — que también sirve /reservar/* públicas —
// y las env NEXT_PUBLIC_* se inline-an con VALOR al compilar (#3 del ataque).

export const NAV_COPILOT: NavArbol = {
  appId: APP_ID,
  secciones: [
    { id: 'inicio', etiqueta: 'Inicio', href: '/', exacto: true, iconoLucide: 'Home' },
    {
      id: 'sec-reuniones',
      etiqueta: 'Reuniones',
      hijos: [
        {
          id: 'reuniones',
          etiqueta: 'Reuniones',
          href: '/reuniones',
          iconoLucide: 'CalendarDays',
          hijos: [
            { id: 'reunion-detalle', etiqueta: 'Detalle', patron: '/reuniones/:id/:vista', ocultoEnSidebar: true },
          ],
        },
        { id: 'conversaciones', etiqueta: 'Conversaciones', href: '/reuniones?vista=conversaciones', iconoLucide: 'MessagesSquare' },
        { id: 'grabacion', etiqueta: 'Grabación', href: '/grabacion', exacto: true, iconoLucide: 'Mic' },
      ],
    },
    { id: 'pre-discovery', etiqueta: 'Pre-Discovery', href: '/pre-discovery', iconoLucide: 'Telescope' },
    {
      id: 'sec-agendamiento',
      etiqueta: 'Agendamiento',
      hijos: [
        {
          id: 'asesores',
          etiqueta: 'Asesores',
          href: '/asesores',
          iconoLucide: 'Users',
          hijos: [{ id: 'asesor-agenda', etiqueta: 'Agenda', patron: '/asesores/:id/agenda', ocultoEnSidebar: true }],
        },
        { id: 'citas', etiqueta: 'Citas', href: '/citas', exacto: true, iconoLucide: 'CalendarCheck' },
        { id: 'servicios', etiqueta: 'Servicios', href: '/servicios', iconoLucide: 'Layers' },
      ],
    },
    {
      id: 'sec-buzon',
      etiqueta: 'Buzón',
      hijos: [
        { id: 'buzon', etiqueta: 'Bandeja', href: '/buzon', exacto: true, iconoLucide: 'MailCheck' },
        { id: 'buzon-aprobaciones', etiqueta: 'Aprobaciones', href: '/buzon/aprobaciones', iconoLucide: 'ShieldCheck' },
        { id: 'buzon-politicas', etiqueta: 'Políticas', href: '/buzon/politicas', iconoLucide: 'Settings2' },
        { id: 'buzon-bitacora', etiqueta: 'Bitácora', href: '/buzon/bitacora', iconoLucide: 'ScrollText' },
      ],
    },
    // Sección "huérfana" A PROPÓSITO (profundidad 1, sin hijos): rastroDe puntúa
    // todo patron con +5 SIN importar profundidad, así que un `/buzon/:hilo`
    // anidado bajo 'buzon' (o como hermano a su misma profundidad) le ganaría
    // SIEMPRE a /buzon/aprobaciones|politicas|bitacora (2 segmentos, mismo
    // shape) — coincidencia de puntos que el matcher vendored no resuelve por
    // especificidad real. Verificado empíricamente: solo profundidad 1
    // (estrictamente MÁS SOMERA que los 3 hermanos reales) evita el falso
    // positivo. Precio pagado: el breadcrumb del hilo es un crumb suelto
    // ("Hilo") en vez de "Buzón > Bandeja > Hilo" — aceptable frente a
    // romper el breadcrumb/sidebar de las 3 páginas reales que sí se navegan
    // desde el sidebar. Mismo principio que ya usan reunion-detalle/
    // asesor-agenda: sus patrones de 3 segmentos jamás empatan profundidad con
    // un hermano estático de 2 (/reuniones/nueva, /asesores) — aquí el propio
    // shape de 2 segmentos del hilo (/buzon/[hilo]) sí podía empatar, así que
    // se resuelve por profundidad en vez de por longitud de patrón.
    { id: 'buzon-hilo', etiqueta: 'Hilo', patron: '/buzon/:hilo', ocultoEnSidebar: true },
    {
      id: 'sec-biblioteca',
      etiqueta: 'Biblioteca',
      hijos: [
        { id: 'herramientas', etiqueta: 'Herramientas', href: '/herramientas', exacto: true, iconoLucide: 'LayoutGrid' },
        { id: 'playbooks', etiqueta: 'Playbooks', href: '/playbooks', iconoLucide: 'BookOpenCheck' },
      ],
    },
    { id: 'manager', etiqueta: 'Manager', href: '/manager', iconoLucide: 'ClipboardCheck' },
  ],
}
