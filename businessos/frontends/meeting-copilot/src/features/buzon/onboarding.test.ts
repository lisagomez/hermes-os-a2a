// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { aplicarTransicionBuzon, puedeListo, puedeTransicionarBuzon, TRANSICIONES_BUZON } from './onboarding'
import type { EstadoOnboardingBuzon } from './onboarding'
import { TODAS_LAS_VERIFICACIONES, type Verificacion, type VerificacionId } from './verificacion'

const AHORA = '2026-08-01T00:00:00.000Z'

function estadoBase(estado: EstadoOnboardingBuzon['estado'], espejoDesde: string | null = null): EstadoOnboardingBuzon {
  return { estado, espejoDesde, activadoPor: null, activadoEn: null }
}

function verificacionesCompletas(estado: Verificacion['estado'] = 'verificado'): Verificacion[] {
  return TODAS_LAS_VERIFICACIONES.map((id: VerificacionId) => ({
    id,
    estado,
    mensaje: 'ok',
    ultimaRevision: AHORA,
  }))
}

describe('máquina de transiciones del onboarding (§11.1)', () => {
  it('la tabla solo permite el camino lineal + pausado/desconectado', () => {
    expect(TRANSICIONES_BUZON.borrador).toEqual(['configurando'])
    expect(TRANSICIONES_BUZON.configurando).toEqual(['espejo'])
    expect(TRANSICIONES_BUZON.espejo).toEqual(['listo'])
    expect(TRANSICIONES_BUZON.listo).toEqual(['activo'])
    expect(TRANSICIONES_BUZON.activo.sort()).toEqual(['desconectado', 'pausado'])
    expect(TRANSICIONES_BUZON.pausado.sort()).toEqual(['activo', 'desconectado'])
    expect(TRANSICIONES_BUZON.desconectado).toEqual([])
  })

  it('no se puede saltar espejo: borrador→espejo directo es inválido', () => {
    expect(puedeTransicionarBuzon('borrador', 'espejo')).toBe(false)
    expect(puedeTransicionarBuzon('configurando', 'activo')).toBe(false)
    expect(puedeTransicionarBuzon('desconectado', 'activo')).toBe(false)
  })

  it('elegir_plantilla: borrador → configurando', () => {
    const r = aplicarTransicionBuzon(estadoBase('borrador'), 'elegir_plantilla', 'cliente', AHORA)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.estado.estado).toBe('configurando')
  })

  it('verificaciones_completas rechaza si algo no está verificado, y fija espejoDesde al pasar', () => {
    const incompleto = verificacionesCompletas().map((v, i) => (i === 0 ? { ...v, estado: 'pendiente' as const } : v))
    const fallo = aplicarTransicionBuzon(estadoBase('configurando'), 'verificaciones_completas', 'sistema_verificacion', AHORA, {
      verificaciones: incompleto,
    })
    expect(fallo.ok).toBe(false)

    const ok = aplicarTransicionBuzon(estadoBase('configurando'), 'verificaciones_completas', 'sistema_verificacion', AHORA, {
      verificaciones: verificacionesCompletas(),
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.estado.estado).toBe('espejo')
      expect(ok.estado.espejoDesde).toBe(AHORA)
    }
  })

  it('firmar_activacion exige actor=aprobador y un nombre de quien firma', () => {
    const base = estadoBase('listo', '2026-07-01T00:00:00.000Z')
    const sinActor = aplicarTransicionBuzon(base, 'firmar_activacion', 'cliente', AHORA, { activadoPor: 'Elisa — CEO' })
    expect(sinActor.ok).toBe(false)

    const sinNombre = aplicarTransicionBuzon(base, 'firmar_activacion', 'aprobador', AHORA, {})
    expect(sinNombre.ok).toBe(false)

    const ok = aplicarTransicionBuzon(base, 'firmar_activacion', 'aprobador', AHORA, { activadoPor: 'Elisa — CEO' })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.estado.estado).toBe('activo')
      expect(ok.estado.activadoPor).toBe('Elisa — CEO')
      expect(ok.estado.activadoEn).toBe(AHORA)
    }
  })

  it('pausar/reanudar/desconectar solo los dispara el Guardian', () => {
    const activo = estadoBase('activo', '2026-07-01T00:00:00.000Z')
    expect(aplicarTransicionBuzon(activo, 'pausar', 'cliente', AHORA).ok).toBe(false)
    const pausado = aplicarTransicionBuzon(activo, 'pausar', 'guardian', AHORA)
    expect(pausado.ok).toBe(true)
    if (pausado.ok) expect(pausado.estado.estado).toBe('pausado')

    const reanudado = aplicarTransicionBuzon(estadoBase('pausado'), 'reanudar', 'guardian', AHORA)
    expect(reanudado.ok).toBe(true)
    if (reanudado.ok) expect(reanudado.estado.estado).toBe('activo')

    const desconectado = aplicarTransicionBuzon(activo, 'desconectar', 'guardian', AHORA)
    expect(desconectado.ok).toBe(true)
    if (desconectado.ok) expect(desconectado.estado.estado).toBe('desconectado')
  })

  it('desconectado es terminal', () => {
    const r = aplicarTransicionBuzon(estadoBase('desconectado'), 'reanudar', 'guardian', AHORA)
    expect(r.ok).toBe(false)
  })
})

describe('puedeListo — el gate que no se puede saltar (§11.1)', () => {
  const espejoDesde = '2026-07-25T00:00:00.000Z' // 7 días exactos antes de AHORA

  it('6 días y 20 borradores → NO', () => {
    const ahora = '2026-07-31T00:00:00.000Z' // 6 días desde espejoDesde
    const r = puedeListo({ espejoDesde }, 20, ahora)
    expect(r.ok).toBe(false)
  })

  it('7 días y 19 borradores → NO', () => {
    const r = puedeListo({ espejoDesde }, 19, AHORA)
    expect(r.ok).toBe(false)
  })

  it('7 días y 20 borradores → SÍ', () => {
    const r = puedeListo({ espejoDesde }, 20, AHORA)
    expect(r.ok).toBe(true)
  })

  it('sin espejoDesde → NO, sin importar los borradores', () => {
    const r = puedeListo({ espejoDesde: null }, 1000, AHORA)
    expect(r.ok).toBe(false)
  })

  it('CONTROL: si se ignora la condición de días, el caso de 6 días debe volverse rojo', () => {
    // Documenta la regresión que se probó a mano: reemplazar `dias < DIAS_MINIMOS_ESPEJO`
    // por `false` (nunca bloquear por días) haría que este `expect` fallara — es la
    // verificación de que el test SÍ ejercita la condición de días, no solo la de borradores.
    const ahora = '2026-07-31T00:00:00.000Z'
    const r = puedeListo({ espejoDesde }, 999, ahora)
    expect(r.ok).toBe(false)
  })

  it('solicitar_activacion (evento) usa el mismo gate: 7 días/19 falla, 7/20 pasa', () => {
    const base: EstadoOnboardingBuzon = { estado: 'espejo', espejoDesde, activadoPor: null, activadoEn: null }
    const fallo = aplicarTransicionBuzon(base, 'solicitar_activacion', 'cliente', AHORA, { borradoresGenerados: 19 })
    expect(fallo.ok).toBe(false)
    const ok = aplicarTransicionBuzon(base, 'solicitar_activacion', 'cliente', AHORA, { borradoresGenerados: 20 })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.estado.estado).toBe('listo')
  })
})
