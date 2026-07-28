import { test, expect } from '@playwright/test'
import type { ContratoSc } from '../src/features/dashboard/types'
import { ContratoRevision } from '../src/features/dashboard/components/contratos/contrato-revision'
import { EstadoContratoBadge } from '../src/features/dashboard/components/contratos/estado-contrato-badge'
import { CHROME, STATUS } from '../src/shared/constants/colors'

/**
 * Tests del paquete de revisión de /contratos (Fase 12 F5), sin navegador
 * (mismo patrón que desarrollo.spec.ts: componentes puros → árbol JSX
 * instrumentado → texto + inline styles). Fijan la doctrina G4: banderas G1
 * ARRIBA, hash G5 visible, renglón O1 presente, y estados nunca color-solo.
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

function renderCmp<C extends (p: never) => unknown>(cmp: C, props: Parameters<C>[0]): Rendered {
  return render((cmp as (p: typeof props) => unknown)(props))
}

const AHORA = Date.parse('2026-07-27T12:00:00Z')

function contrato(extra: Partial<ContratoSc> = {}): ContratoSc {
  return {
    id: 'c1',
    task_id: 'sc-test-0001',
    solicitante: 'telegram:1',
    plantilla: 'escrow-v1',
    canal_destino: 'canal-clientes-demo',
    estado: 'en_revision',
    secuencia: 1,
    hash_paquete: 'abc123def4567890abc123def4567890abc123def4567890abc123def4567890',
    banderas: [
      {
        codigo: 'condicion_unilateral',
        severidad: 'alta',
        detalle: 'desde entregado toda salida la controla comprador',
        donde: 'estado entregado',
      },
    ],
    manifest: {
      diff: [{ antes: 'mspComprador = "Org1MSP"', despues: 'mspComprador = "AcmeMSP"' }],
      criterios_aceptacion: ['vendedor NO puede liberar_pago'],
      politica_endorsement: "AND('Org1MSP.peer','Org2MSP.peer')",
    },
    red_efimera: {
      verde: true,
      fase: 'red',
      resumen: { transiciones: 6, negativos: 5, invocaciones: 25 },
    },
    en_revision_desde: '2026-07-27T10:30:00Z',
    aprobado_por: null,
    aprobado_en: null,
    motivo_rechazo: null,
    desplegado_en: null,
    created_at: '2026-07-27T09:00:00Z',
    ...extra,
  }
}

// --------------------------- Badge de estado ---------------------------

test('EstadoContratoBadge: cada estado lleva glifo + texto y su color', () => {
  const casos: Array<[string, string]> = [
    ['aprobado', STATUS.good],
    ['desplegado', STATUS.good],
    ['rechazado', STATUS.critical],
    ['escalado', STATUS.warning],
    ['en_revision', STATUS.warning],
  ]
  for (const [estado, color] of casos) {
    const { text, styles } = renderCmp(EstadoContratoBadge, { estado })
    expect(text).toContain(estado.replace(/_/g, ' '))
    expect(styles[0]?.color).toBe(color)
  }
})

test('EstadoContratoBadge: un estado desconocido no revienta (gris, glifo neutro)', () => {
  const { text, styles } = renderCmp(EstadoContratoBadge, { estado: 'algo_nuevo' })
  expect(text).toContain('algo nuevo')
  expect(styles[0]?.color).toBe(CHROME.muted)
})

// ------------------------ Paquete de revisión -------------------------

test('las banderas G1 van ANTES del diff y del hash (anti-sello-de-goma G4)', () => {
  const { text } = renderCmp(ContratoRevision, { contrato: contrato(), ahora: AHORA })
  const posBandera = text.indexOf('bandera alta')
  const posDiff = text.indexOf('Diff acotado')
  const posHash = text.indexOf('Hash del paquete')
  expect(posBandera).toBeGreaterThan(-1)
  expect(posBandera).toBeLessThan(posDiff)
  expect(posBandera).toBeLessThan(posHash)
  expect(text).toContain('segunda mirada')
})

test('bandera alta pinta con el color critical; media con warning', () => {
  const { styles } = renderCmp(ContratoRevision, {
    contrato: contrato({
      banderas: [
        { codigo: 'x', severidad: 'alta', detalle: 'd', donde: 'w' },
        { codigo: 'y', severidad: 'media', detalle: 'd', donde: 'w' },
      ],
    }),
    ahora: AHORA,
  })
  const colores = styles.map((s) => s.color)
  expect(colores).toContain(STATUS.critical)
  expect(colores).toContain(STATUS.warning)
})

test('sin banderas se DICE (no se oculta la sección) y el renglón O1 siempre está', () => {
  const { text } = renderCmp(ContratoRevision, {
    contrato: contrato({ banderas: [] }),
    ahora: AHORA,
  })
  expect(text).toContain('Sin banderas G1')
  expect(text).toContain('qué gana cada')
})

test('el paquete muestra hash G5, diff acotado, red efímera y tiempo en revisión', () => {
  const { text } = renderCmp(ContratoRevision, { contrato: contrato(), ahora: AHORA })
  expect(text).toContain('abc123def4567890')
  expect(text).toContain('mspComprador = "AcmeMSP"')
  expect(text).toContain('6 transiciones')
  // 10:30 → 12:00 = 1 h 30 min, corriendo
  expect(text).toContain('1 h 30 min')
  expect(text).toContain('(corriendo)')
})

test('red efímera roja se reporta con fase y motivo; sin corrida se declara', () => {
  const roja = renderCmp(ContratoRevision, {
    contrato: contrato({
      red_efimera: { verde: false, fase: 'integridad', motivo: 'paquete alterado' },
    }),
    ahora: AHORA,
  })
  expect(roja.text).toContain('roja en fase integridad')
  expect(roja.text).toContain('paquete alterado')

  const sinCorrida = renderCmp(ContratoRevision, {
    contrato: contrato({ red_efimera: null }),
    ahora: AHORA,
  })
  expect(sinCorrida.text).toContain('sin corrida')
})

test('fila decidida muestra quién y cuándo, y el motivo si fue rechazo', () => {
  const { text } = renderCmp(ContratoRevision, {
    contrato: contrato({
      estado: 'rechazado',
      aprobado_por: 'elisa.qualy@gmail.com',
      aprobado_en: '2026-07-27T11:00:00Z',
      motivo_rechazo: 'la spec no refleja el acuerdo',
    }),
    ahora: AHORA,
  })
  expect(text).toContain('elisa.qualy@gmail.com')
  expect(text).toContain('la spec no refleja el acuerdo')
  // tiempo de revisión cerrado: 10:30 → 11:00 = 30 min, ya no corre
  expect(text).toContain('30 min')
  expect(text).not.toContain('(corriendo)')
})
