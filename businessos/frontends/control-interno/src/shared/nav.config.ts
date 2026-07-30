// Árbol de navegación de control-interno (config, no JSX) + identidad en el
// ecosistema. Schema/funciones: src/shared/app-registry (vendored). El RBAC
// sigue siendo de la app: el sidebar cruza cada nodo con canAccessRoute
// (permisoRuta ?? href) — una sección sin hijos visibles para el rol no se pinta.
// Fuera del árbol: '/' y '/command-center' (redirects server-side) y '/settings'
// (fila inferior de iconos, como siempre).

import type { NavArbol } from './app-registry'

export const APP_ID = 'control-interno'

// GOTCHA Next: process.env[dinámico] no se inline-a en cliente → claves literales.
export const OVERRIDES_URL: Record<string, string | undefined> = {
  'mission-control': process.env.NEXT_PUBLIC_APP_MISSION_CONTROL_URL,
  'control-interno': process.env.NEXT_PUBLIC_APP_CONTROL_INTERNO_URL,
  'meeting-copilot': process.env.NEXT_PUBLIC_APP_MEETING_COPILOT_URL,
}

export const NAV_CI: NavArbol = {
  appId: APP_ID,
  secciones: [
    {
      id: 'agente',
      etiqueta: 'Agente',
      hijos: [
        { id: 'chat', etiqueta: 'Chat', href: '/chat', iconoLucide: 'Bot' },
        { id: 'conversations', etiqueta: 'Conversations', href: '/conversations', iconoLucide: 'MessagesSquare' },
      ],
    },
    {
      id: 'espacios',
      etiqueta: 'Espacios',
      hijos: [
        { id: 'board', etiqueta: 'Board', href: '/board', iconoLucide: 'LayoutGrid' },
        { id: 'calendar', etiqueta: 'Calendar', href: '/calendar', iconoLucide: 'CalendarDays' },
        // /draw3 conserva su caso especial: el sidebar lo reescribe a /draw3/{lastPageId}.
        { id: 'canvas', etiqueta: 'Canvas', href: '/draw3', iconoLucide: 'Sparkles' },
        { id: 'brain', etiqueta: 'Brain', href: '/segundo-cerebro', iconoLucide: 'Brain' },
      ],
    },
    {
      id: 'finanzas',
      etiqueta: 'Finanzas',
      hijos: [
        {
          id: 'finanzas-home',
          etiqueta: 'Finanzas',
          href: '/finanzas',
          iconoLucide: 'Wallet',
          hijos: [{ id: 'cobros', etiqueta: 'Cobros', href: '/finanzas/cobros' }],
        },
      ],
    },
    {
      id: 'operacion',
      etiqueta: 'Operación',
      hijos: [
        { id: 'ops', etiqueta: 'Ops', href: '/ops', iconoLucide: 'Wrench' },
        { id: 'activity', etiqueta: 'Activity', href: '/activity', iconoLucide: 'Activity' },
        { id: 'cron', etiqueta: 'Cron', href: '/cron', iconoLucide: 'Clock' },
      ],
    },
  ],
}
