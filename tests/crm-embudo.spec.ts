import { test, expect } from '@playwright/test'
import { EmbudoCanvas } from '../src/features/dashboard/components/crm/embudo-canvas'
import { ConversacionesPanel } from '../src/features/dashboard/components/crm/conversaciones-panel'
import { EstadoLeadBadge } from '../src/features/dashboard/components/crm/estado-lead-badge'
import { LeadsTable } from '../src/features/dashboard/components/crm/leads-table'
import { DepartamentoSubnavView } from '../src/features/dashboard/components/nav/departamento-subnav'
import { STATUS, conAlpha } from '../src/shared/constants/colors'
import {
  ETAPAS_EMBUDO,
  ETAPAS_MOVIBLES,
  type EtapaEmbudo,
  type LeadResumen,
} from '../src/features/dashboard/types'

/**
 * Tests de /crm (embudo + panel + submenú), sin navegador: mismo patrón que
 * tests/desarrollo.spec.ts — componentes puros invocados con props y árbol
 * JSX recorrido para asertar texto y estilos.
 */

interface Rendered {
  text: string
  styles: Record<string, string>[]
}

function render(node: unknown): Rendered {
  const parts: string[] = []
  const styles: Record<string, string>[] = []
  const walk = (n: unknown): void => {
    if (n == null || typeof n === 'boolean') return
    if (typeof n === 'string') { parts.push(n); return }
    if (typeof n === 'number') { parts.push(String(n)); return }
    if (Array.isArray(n)) { n.forEach(walk); return }
    if (typeof n === 'object' && n !== null && '__pw_type' in n) {
      const el = n as unknown as { type: unknown; props?: Record<string, unknown> }
      const props = el.props ?? {}
      if (typeof el.type === 'function') { walk((el.type as (p: typeof props) => unknown)(props)); return }
      if (props.style && typeof props.style === 'object') {
        styles.push(props.style as Record<string, string>)
      }
      walk(props.children)
    }
  }
  walk(node)
  return { text: parts.join(''), styles }
}

const EMBUDO_FIXTURE: EtapaEmbudo[] = ETAPAS_EMBUDO.map((etapa) => ({
  etapa,
  cuenta: etapa === 'nuevo' ? 3 : etapa === 'ganado' ? 1 : 0,
}))

test('el embudo pinta las 9 etapas en orden con sus conteos y los perdidos', () => {
  const { text } = render(EmbudoCanvas({ embudo: EMBUDO_FIXTURE, perdidos: 2 }))
  for (const etapa of ETAPAS_EMBUDO) {
    expect(text).toContain(etapa)
  }
  // orden: nuevo antes que ganado
  expect(text.indexOf('nuevo')).toBeLessThan(text.indexOf('ganado'))
  expect(text).toContain('4 leads en el embudo') // 3 nuevos + 1 ganado
  expect(text).toContain('perdidos')
  expect(text).toContain('2')
})

test('las bandas del embudo se angostan (silueta) y las vacías van en gris', () => {
  const { styles } = render(EmbudoCanvas({ embudo: EMBUDO_FIXTURE, perdidos: 0 }))
  const anchos = styles
    .map((s) => s.width)
    .filter(Boolean)
    .map((w) => parseFloat(String(w)))
  expect(anchos.length).toBe(ETAPAS_EMBUDO.length)
  for (let i = 1; i < anchos.length; i++) {
    expect(anchos[i]).toBeLessThan(anchos[i - 1])
  }
})

test('las bandas activas llevan fondo rgba (conAlpha), no hex concatenado', () => {
  const { styles } = render(EmbudoCanvas({ embudo: EMBUDO_FIXTURE, perdidos: 0 }))
  const fondos = styles.map((s) => s.backgroundColor).filter(Boolean)
  // nuevo (azul de serie #3987e5) y ganado (STATUS.good #0ca30c) al 10%
  expect(fondos).toContain('rgba(57, 135, 229, 0.1)')
  expect(fondos).toContain('rgba(12, 163, 12, 0.1)')
  // ningún fondo con el patrón viejo `${color}1a`
  for (const f of fondos) {
    expect(String(f)).not.toMatch(/^#[0-9a-f]{8}$/i)
  }
})

test('conAlpha valida el hex: 6 dígitos → rgba; otra cosa → el color tal cual', () => {
  expect(conAlpha('#3987e5', 0.1)).toBe('rgba(57, 135, 229, 0.1)')
  expect(conAlpha('#FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)')
  expect(conAlpha('transparent', 0.5)).toBe('transparent')
  expect(conAlpha('#fff', 0.5)).toBe('#fff') // hex corto: sin alpha, sin romper
})

test('una etapa desconocida venida de la BD también se pinta (no se pierde)', () => {
  const { text } = render(
    EmbudoCanvas({
      embudo: [...EMBUDO_FIXTURE, { etapa: 'etapa_futura', cuenta: 5 }],
      perdidos: 0,
    })
  )
  expect(text).toContain('etapa futura')
  expect(text).toContain('5')
})

test('panel de conversaciones: empty state honesto sin tenant conectado', () => {
  const { text } = render(ConversacionesPanel({ conversaciones: [] }))
  expect(text).toContain('Sin conversaciones todavía')
  expect(text).toContain('tenant')
})

test('panel de conversaciones: agrega por estado y desglosa por nivel', () => {
  const { text } = render(
    ConversacionesPanel({
      conversaciones: [
        { estado: 'abierta', nivel: 'A1', cuenta: 4 },
        { estado: 'abierta', nivel: 'A2', cuenta: 2 },
        { estado: 'cerrada', nivel: 'A1', cuenta: 7 },
      ],
    })
  )
  expect(text).toContain('abierta')
  expect(text).toContain('6') // 4 + 2 agregado por estado
  expect(text).toContain('abierta A2: 2')
})

test('el submenú de adquisición lista Tareas y CRM; otros departamentos no pintan nada', () => {
  const conSubmenu = render(
    DepartamentoSubnavView({ departamento: 'adquisicion', seccionActiva: 'crm' })
  )
  expect(conSubmenu.text).toContain('Tareas')
  expect(conSubmenu.text).toContain('CRM')

  const sinSubmenu = render(DepartamentoSubnavView({ departamento: 'software' }))
  expect(sinSubmenu.text).toBe('')

  const sinDepartamento = render(DepartamentoSubnavView({}))
  expect(sinDepartamento.text).toBe('')
})

// ------------------------------ LeadsTable ------------------------------

const accionStub = async (): Promise<void> => {}

const LEADS_FIXTURE: LeadResumen[] = [
  {
    lead_id: 'web2-abc',
    origen: 'web2',
    empresa: 'Mi IA',
    contacto: 'Elisa <elisa@ejemplo.mx>',
    etapa: 'nuevo',
    updated_at: '2026-07-19T04:04:15Z',
  },
  {
    lead_id: 'lead-xyz',
    origen: 'a2a',
    empresa: null,
    contacto: null,
    etapa: 'ganado',
    updated_at: '2026-07-18T23:39:11Z',
  },
]

test('LeadsTable pinta cada lead con su origen, etapa y el formulario de mover', () => {
  const { text } = render(LeadsTable({ leads: LEADS_FIXTURE, accionMover: accionStub }))
  expect(text).toContain('Mi IA')
  expect(text).toContain('web2')
  expect(text).toContain('a2a')
  expect(text).toContain('Sin empresa') // empresa null no rompe la fila
  expect(text).toContain('Mover')
  // el select de mover ofrece TODAS las etapas movibles (embudo + perdido)
  for (const etapa of ETAPAS_MOVIBLES) {
    expect(text).toContain(etapa.replace(/_/g, ' '))
  }
})

test('LeadsTable con cero leads muestra empty state, no tabla rota', () => {
  const { text } = render(LeadsTable({ leads: [], accionMover: accionStub }))
  expect(text).toContain('Sin leads todavía')
  expect(text).not.toContain('Mover')
})

test('EstadoLeadBadge: ganado verde, perdido rojo, etapas vivas azules', () => {
  const ganado = render(EstadoLeadBadge({ etapa: 'ganado' }))
  expect(ganado.styles[0]?.color).toBe(STATUS.good)
  const perdido = render(EstadoLeadBadge({ etapa: 'perdido' }))
  expect(perdido.styles[0]?.color).toBe(STATUS.critical)
  const vivo = render(EstadoLeadBadge({ etapa: 'propuesta' }))
  expect(vivo.styles[0]?.color).toBe('#3987e5')
})
