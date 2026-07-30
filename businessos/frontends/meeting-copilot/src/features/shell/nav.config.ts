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
