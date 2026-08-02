// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { useBuzonStore } from './store'

beforeEach(() => {
  useBuzonStore.setState(useBuzonStore.getInitialState(), true)
})

describe('actualizarPoliticaBuzon — guard de firma de riesgo', () => {
  it('rechaza pasar a modo abierto sin firma completa (la UI no debe poder guardarlo)', () => {
    const r = useBuzonStore.getState().actualizarPoliticaBuzon('buzon-ventas', { modoContraparte: 'abierto' })
    expect(r.ok).toBe(false)
    // el buzón NO debe haber cambiado
    expect(useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-ventas')?.modoContraparte).toBe('abierto_cuarentena')
  })

  it('acepta modo abierto CON firma completa y persiste copy-on-write', () => {
    const r = useBuzonStore.getState().actualizarPoliticaBuzon('buzon-ventas', {
      modoContraparte: 'abierto',
      riesgoFirmadoPor: 'CEO — Elisa',
      riesgoFirmadoEn: '2026-08-02T00:00:00.000Z',
    })
    expect(r.ok).toBe(true)
    const buzon = useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-ventas')
    expect(buzon?.modoContraparte).toBe('abierto')
    expect(buzon?.riesgoFirmadoPor).toBe('CEO — Elisa')
  })

  it('cerrado/abierto_cuarentena no requieren firma', () => {
    const r = useBuzonStore.getState().actualizarPoliticaBuzon('buzon-asesoria', { cuotaHora: 20 })
    expect(r.ok).toBe(true)
    expect(useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-asesoria')?.cuotaHora).toBe(20)
  })

  it('un buzón inexistente falla explícitamente', () => {
    expect(useBuzonStore.getState().actualizarPoliticaBuzon('buzon-no-existe', { cuotaHora: 1 }).ok).toBe(false)
  })
})

describe('decidirAprobacion — la única puerta de la bandeja de A5', () => {
  it('aprobar mueve pendiente_aprobacion → aprobado y registra bitácora', () => {
    const antesBitacora = useBuzonStore.getState().bitacora.length
    const r = useBuzonStore.getState().decidirAprobacion('saliente-bienvenida', 'aprobar', 'ok, dentro de política')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.correo.estado).toBe('aprobado')
    expect(useBuzonStore.getState().salientes.find((s) => s.id === 'saliente-bienvenida')?.estado).toBe('aprobado')
    expect(useBuzonStore.getState().bitacora.length).toBe(antesBitacora + 1)
  })

  it('rechazar mueve pendiente_aprobacion → rechazado_humano', () => {
    const r = useBuzonStore.getState().decidirAprobacion('saliente-bienvenida', 'rechazar', 'tono incorrecto')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.correo.estado).toBe('rechazado_humano')
  })

  it('rechazar y reportar mueve pendiente_aprobacion → reportado_inyeccion', () => {
    const r = useBuzonStore.getState().decidirAprobacion('saliente-bienvenida', 'reportar_inyeccion', 'intento de inyección detectado')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.correo.estado).toBe('reportado_inyeccion')
  })

  it('un correo que ya no está en pendiente_aprobacion rechaza la decisión (máquina de estados real)', () => {
    // saliente-canario está en rechazado_gates (terminal): no puede aprobarse.
    const r = useBuzonStore.getState().decidirAprobacion('saliente-canario', 'aprobar', 'x')
    expect(r.ok).toBe(false)
  })

  it('un correo inexistente falla explícitamente', () => {
    expect(useBuzonStore.getState().decidirAprobacion('correo-no-existe', 'aprobar').ok).toBe(false)
  })
})
