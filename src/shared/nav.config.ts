// Árbol de navegación de Mission Control (config, no JSX) + identidad de la
// app en el ecosistema. Schema y funciones: src/shared/app-registry (vendored).
// El antiguo SUBMENUS de adquisición (departamento-subnav) vive aquí como
// jerarquía real: Ejecución › Adquisición › Tareas. (El CRM se movió a
// meeting-copilot /crm el 2026-08-08.)

import type { NavArbol } from './app-registry'

export const APP_ID = 'mission-control'

// GOTCHA Next: process.env[dinámico] no se inline-a en cliente → claves literales.
export const OVERRIDES_URL: Record<string, string | undefined> = {
  'mission-control': process.env.NEXT_PUBLIC_APP_MISSION_CONTROL_URL,
  'control-interno': process.env.NEXT_PUBLIC_APP_CONTROL_INTERNO_URL,
  'meeting-copilot': process.env.NEXT_PUBLIC_APP_MEETING_COPILOT_URL,
}

export const NAV_MC: NavArbol = {
  appId: APP_ID,
  secciones: [
    {
      id: 'panorama',
      etiqueta: 'Panorama',
      hijos: [
        { id: 'pantheon', etiqueta: 'Pantheon', href: '/dashboard', exacto: true, glifo: '✦' },
        { id: 'ai-spend', etiqueta: 'AI Spend', href: '/ai-spend', glifo: '＄' },
        {
          id: 'grafo',
          etiqueta: 'Grafo',
          href: '/grafo',
          glifo: '◈',
          hijos: [
            { id: 'grafo-explorador', etiqueta: 'Explorador', href: '/grafo/explorador' },
          ],
        },
      ],
    },
    {
      id: 'ejecucion',
      etiqueta: 'Ejecución',
      hijos: [
        { id: 'desarrollo', etiqueta: 'Desarrollo', href: '/desarrollo', exacto: true, glifo: '⚙' },
        {
          id: 'adquisicion',
          etiqueta: 'Adquisición',
          href: '/desarrollo?departamento=adquisicion',
          glifo: '◎',
          hijos: [{ id: 'adquisicion-tareas', etiqueta: 'Tareas', href: '/desarrollo?departamento=adquisicion' }],
        },
        // CRM: MOVIDO a meeting-copilot /crm (2026-08-08); aquí queda un
        // redirect en next.config para la memoria muscular.
      ],
    },
    {
      id: 'legal',
      etiqueta: 'Legal',
      hijos: [{ id: 'contratos', etiqueta: 'Contratos SC', href: '/contratos', glifo: '§' }],
    },
  ],
}
