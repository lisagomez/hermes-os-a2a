// Árbol de navegación de Meeting Copilot (config, no JSX) + identidad en el
// ecosistema. Schema/funciones: src/shared/app-registry (vendored). Los nodos
// ocultoEnSidebar (detalles con :id) solo existen para el breadcrumb.
// Configuración queda en el footer del sidebar, fuera del árbol (como siempre).

import type { NavArbol } from '@/shared/app-registry'

export const APP_ID = 'meeting-copilot'

// GOTCHA Next: process.env[dinámico] no se inline-a en cliente → claves literales.
export const OVERRIDES_URL: Record<string, string | undefined> = {
  'mission-control': process.env.NEXT_PUBLIC_APP_MISSION_CONTROL_URL,
  'control-interno': process.env.NEXT_PUBLIC_APP_CONTROL_INTERNO_URL,
  'meeting-copilot': process.env.NEXT_PUBLIC_APP_MEETING_COPILOT_URL,
}

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
