import {
  FileSignature,
  Gavel,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

/**
 * Catálogo único de los 4 avatares: lo consumen la portada (tarjetas), la
 * barra lateral del shell y las barras de pestañas de cada segmento. Persona y
 * dolor vienen de INVESTIGACION-SINTESIS.md (§4.2–4.4, §5.2 de la
 * investigación de buyer persona).
 */

export type VistaAvatar = {
  href: string
  etiqueta: string
}

export type AvatarDef = {
  id: 'fiscal' | 'litigio' | 'contratos' | 'direccion'
  /** Prefijo de ruta del segmento, p. ej. '/fiscal'. */
  base: string
  icono: LucideIcon
  nombre: string
  persona: string
  dolor: string
  vistas: VistaAvatar[]
}

export function avatarPorId(id: AvatarDef['id']): AvatarDef {
  const avatar = AVATARES.find((candidato) => candidato.id === id)
  if (!avatar) throw new Error(`Avatar desconocido: ${id}`)
  return avatar
}

export const AVATARES: AvatarDef[] = [
  {
    id: 'fiscal',
    base: '/fiscal',
    icono: Landmark,
    nombre: 'Avatar Fiscal',
    persona: 'Socios y equipo fiscal',
    dolor:
      'Criterios dispersos, tiempo perdido en documentos repetitivos y poca visibilidad de los casos con mayor riesgo ante cambios normativos.',
    vistas: [
      { href: '/fiscal/intake', etiqueta: 'Intake guiado' },
      { href: '/fiscal/criterios', etiqueta: 'Criterios aplicables' },
      { href: '/fiscal/alertas', etiqueta: 'Alertas regulatorias' },
      { href: '/fiscal/resumen', etiqueta: 'Resumen de caso' },
    ],
  },
  {
    id: 'litigio',
    base: '/litigio',
    icono: Gavel,
    nombre: 'Avatar de Litigio',
    persona: 'Coordinación de litigio',
    dolor:
      'Riesgo de perder plazos, sin vista única del pipeline de casos e información procesal repartida en correos y hojas de cálculo.',
    vistas: [
      { href: '/litigio/pipeline', etiqueta: 'Pipeline de casos' },
      { href: '/litigio/agenda', etiqueta: 'Agenda y plazos' },
      { href: '/litigio/checklists', etiqueta: 'Checklists' },
      { href: '/litigio/comunicacion', etiqueta: 'Comunicación' },
    ],
  },
  {
    id: 'contratos',
    base: '/contratos',
    icono: FileSignature,
    nombre: 'Avatar de Contratos',
    persona: 'Firmas corporativas y comerciales',
    dolor:
      'Flujos contractuales lentos, poca trazabilidad de cláusulas y versiones, y precedentes que nadie encuentra cuando se necesitan.',
    vistas: [
      { href: '/contratos/intake', etiqueta: 'Intake de operación' },
      { href: '/contratos/clausulas', etiqueta: 'Cláusulas' },
      { href: '/contratos/versiones', etiqueta: 'Versiones y aprobaciones' },
      { href: '/contratos/precedentes', etiqueta: 'Precedentes' },
    ],
  },
  {
    id: 'direccion',
    base: '/direccion',
    icono: LayoutDashboard,
    nombre: 'Avatar Director',
    persona: 'Socios y gerencia multipráctica',
    dolor:
      'Conocimiento y métricas fragmentados entre áreas: sin vista transversal de casos, carga de trabajo y riesgo agregado del despacho.',
    vistas: [
      { href: '/direccion/panorama', etiqueta: 'Panorama 360' },
      { href: '/direccion/departamentos', etiqueta: 'Departamentos' },
      { href: '/direccion/alertas', etiqueta: 'Alertas ejecutivas' },
      { href: '/direccion/clientes', etiqueta: 'Clientes estratégicos' },
    ],
  },
]
