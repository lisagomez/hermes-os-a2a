// VENDORED-FROM businessos/frontends/app-registry/src/apps.ts (v2, c1bb9bf2fea4)
// NO editar aquí: editar el canónico y correr node scripts/sync-vendored.mjs
// @a2a/app-registry — REGISTRO CANÓNICO de las apps del ecosistema.
// DATOS PUROS: cero JSX, cero dependencias. Cada app interna consume una copia
// VENDORED (src/shared/app-registry/) sincronizada con scripts/sync-vendored.mjs;
// el JSX del launcher es local por app ("aislar, no fundir": se comparte el
// DATO, nunca el componente).
//
// Alta de una app nueva: añadir su fila AQUÍ con `audiencia` decidida al nacer
// (las públicas jamás pintan launcher), correr el sync y subir REGISTRY_VERSION
// + línea en CHANGELOG.md — todo en el MISMO commit.

/** Entero monotónico; el sync lo estampa en la cabecera de cada copia vendored. */
export const REGISTRY_VERSION = 2

export type AudienciaApp = 'interna' | 'publica'

export interface AppEcosistema {
  id: string
  nombre: string
  descripcion: string
  /** Glifo Unicode — obligatorio (Mission Control no tiene lucide). */
  glifo: string
  /** Nombre de icono lucide como string; las apps que lo tienen lo mapean localmente. */
  iconoLucide?: string
  audiencia: AudienciaApp
  /** '' = sin deploy → el tile se pinta "En construcción" (deshabilitado). */
  urlProd: string
  urlDevDefault: string
  /** Documental: QUÉ env var overridea la URL en cada deploy (ver resolverUrlApp). */
  envVarUrl: string
  /** Aviso de acceso que se pinta en el tile (p. ej. 'vía túnel SSH'). */
  nota?: string
  /** Doc interna para el link "saber más" de un tile en construcción. */
  docUrl?: string
}

export const APPS: AppEcosistema[] = [
  {
    id: 'mission-control',
    nombre: 'Mission Control',
    descripcion: 'Panel del negocio: Pantheon, AI Spend, grafo, desarrollo, CRM y contratos',
    glifo: '◉',
    iconoLucide: 'Radar',
    audiencia: 'interna',
    urlProd: 'https://a2abot-mission-control.vercel.app',
    urlDevDefault: 'http://localhost:3000',
    envVarUrl: 'NEXT_PUBLIC_APP_MISSION_CONTROL_URL',
  },
  {
    id: 'control-interno',
    nombre: 'Control Interno',
    descripcion: 'Cabina del equipo: board, calendario, finanzas, ops y segundo cerebro',
    glifo: '▣',
    iconoLucide: 'Bot',
    audiencia: 'interna',
    // Sin URL pública: 127.0.0.1 era una URL de producción imposible (clic desde
    // Vercel = perder la pestaña del panel en un ERR_CONNECTION_REFUSED). El tile
    // queda 'en construcción' con la nota; se habilita con la env de override.
    urlProd: '',
    urlDevDefault: 'http://localhost:3001',
    envVarUrl: 'NEXT_PUBLIC_APP_CONTROL_INTERNO_URL',
    nota: 'vía túnel SSH — sin URL pública',
  },
  {
    id: 'meeting-copilot',
    nombre: 'Meeting Copilot',
    descripcion: 'Copiloto comercial: reuniones, pre-discovery y agendamiento de asesores',
    glifo: '◈',
    iconoLucide: 'Telescope',
    audiencia: 'interna',
    urlProd: 'https://meeting-copilot-pi.vercel.app',
    urlDevDefault: 'http://localhost:3002',
    envVarUrl: 'NEXT_PUBLIC_APP_MEETING_COPILOT_URL',
  },
  {
    id: 'cliente-web2',
    nombre: 'Cliente Web2',
    descripcion: 'Landing pública de clientes (deck builder, intake, chat de venta)',
    glifo: '◇',
    iconoLucide: 'Globe',
    audiencia: 'publica',
    urlProd: 'https://cliente-web2.vercel.app',
    urlDevDefault: 'http://localhost:3003',
    envVarUrl: 'NEXT_PUBLIC_APP_CLIENTE_WEB2_URL',
  },
  {
    id: 'cliente-a2a-web3',
    nombre: 'Cliente A2A Web3',
    descripcion: 'Superficie pública de la Tarjeta A2A (scaffold en construcción)',
    glifo: '△',
    iconoLucide: 'Layers',
    audiencia: 'publica',
    urlProd: '',
    urlDevDefault: 'http://localhost:3004',
    envVarUrl: 'NEXT_PUBLIC_APP_CLIENTE_A2A_WEB3_URL',
    docUrl: 'businessos/frontends/cliente-a2a-web3/INTEGRATION.md',
  },
]

/** Solo apps internas: las públicas JAMÁS aparecen en un launcher (fuga de superficie). */
export function appsParaLauncher(): AppEcosistema[] {
  return APPS.filter((a) => a.audiencia === 'interna')
}

/** Resuelve la URL de una app. GOTCHA Next: `process.env[dinámico]` NO se
 *  inline-a en el cliente — cada app construye su mapa ESTÁTICO de overrides
 *  (claves literales `process.env.NEXT_PUBLIC_APP_*_URL`) y lo pasa aquí. */
export function resolverUrlApp(
  app: AppEcosistema,
  opciones: { overrides?: Record<string, string | undefined>; produccion?: boolean } = {}
): string {
  const override = opciones.overrides?.[app.id]
  if (override) return override
  return (opciones.produccion ?? true) ? app.urlProd : app.urlDevDefault
}
