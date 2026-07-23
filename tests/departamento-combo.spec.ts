import { test, expect } from '@playwright/test'
import { DepartamentoCombo } from '../src/features/dashboard/components/desarrollo/departamento-combo'
import { DEPARTAMENTOS_REGISTRADOS } from '../src/features/dashboard/types'

/**
 * Tests del combo de departamento de /desarrollo, sin navegador (mismo patrón
 * que tests/desarrollo.spec.ts): el componente es una función pura sin hooks,
 * se invoca con props y se recorre su árbol JSX instrumentado por el runner
 * para asertar sobre el texto que produciría.
 */

function renderText(node: unknown): string {
  const parts: string[] = []
  const walk = (n: unknown): void => {
    if (n == null || typeof n === 'boolean') return
    if (typeof n === 'string') { parts.push(n); return }
    if (typeof n === 'number') { parts.push(String(n)); return }
    if (Array.isArray(n)) { n.forEach(walk); return }
    if (typeof n === 'object' && n !== null && '__pw_type' in n) {
      const el = n as unknown as { type: unknown; props?: Record<string, unknown> }
      const props = el.props ?? {}
      if (typeof el.type === 'function') { walk((el.type as (p: typeof props) => unknown)(props)); return }
      walk(props.children)
    }
  }
  walk(node)
  return parts.join('')
}

test('el combo lista "Todos" + los departamentos registrados en el Supervisor', () => {
  const text = renderText(
    DepartamentoCombo({ departamentos: [...DEPARTAMENTOS_REGISTRADOS] })
  )
  expect(text).toContain('Departamento')
  expect(text).toContain('Todos')
  expect(text).toContain('adquisicion')
  expect(text).toContain('software')
})

test('el combo formatea guiones bajos como espacios en el label', () => {
  const text = renderText(
    DepartamentoCombo({ departamentos: ['contratos_inteligentes'] })
  )
  expect(text).toContain('contratos inteligentes')
  expect(text).not.toContain('contratos_inteligentes')
})

test('un departamento presente solo en `tareas` (no registrado) también se lista', () => {
  // El combo pinta lo que le llegue del data layer: la unión registrados ∪
  // v_departamentos se hace en services, aquí solo se verifica que no filtra.
  const text = renderText(
    DepartamentoCombo({ departamentos: ['software', 'ventas_nuevo'] })
  )
  expect(text).toContain('ventas nuevo')
})
