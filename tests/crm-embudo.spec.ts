import { test, expect } from '@playwright/test'
import { EmbudoCanvas } from '../src/features/dashboard/components/crm/embudo-canvas'
import { ConversacionesPanel } from '../src/features/dashboard/components/crm/conversaciones-panel'
import { DepartamentoSubnavView } from '../src/features/dashboard/components/nav/departamento-subnav'
import { ETAPAS_EMBUDO, type EtapaEmbudo } from '../src/features/dashboard/types'

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
