// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { correrPipeline } from './pipeline'
import { usePreDiscoveryStore } from './store'
import { useActivosStore, costoAcumulado } from '@/features/activos/store'
import { INTAKE_GAL } from './fixtures'
import { ORDEN_BLOQUES } from './types'

// AGENT_ENGINE default = 'rules' en tests → el pipeline cae al mock declarado.

describe('pipeline de Pre-Discovery (fallback mock declarado)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red en tests')))
  })

  it('corre los 8 bloques, todos con procedencia declarada, y el caso queda listo', async () => {
    const casoId = usePreDiscoveryStore.getState().crearCaso('lead-test', INTAKE_GAL)
    await correrPipeline(casoId)
    const caso = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId)
    expect(caso?.estado).toBe('listo')
    for (const b of ORDEN_BLOQUES) {
      const bloque = caso?.bloques[b]
      expect(['listo', 'no_concluyente']).toContain(bloque?.estado)
      expect(bloque?.procedencia?.metodo).toBe('mock')
      expect(bloque?.procedencia?.fuente.length).toBeGreaterThan(0)
    }
  })

  it('registra el activo del caso (espejo ACT) con versión y ledger append-only', async () => {
    const casoId = usePreDiscoveryStore.getState().crearCaso('lead-test-2', INTAKE_GAL)
    await correrPipeline(casoId)
    const caso = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId)
    expect(caso?.activoId).toBeTruthy()
    const activos = useActivosStore.getState()
    const activo = activos.activos.find((a) => a.id === caso?.activoId)
    expect(activo?.folio).toMatch(/^ACT-LOC-\d{4}$/)
    expect(activo?.clase).toBe('pre_discovery')
    expect(activo?.estatus).toBe('propuesto')
    expect(activo?.versiones.length).toBeGreaterThanOrEqual(1)
    // El ledger declara fuente en TODAS las entradas (doctrina act_costo).
    const ledger = activos.ledger.filter((c) => c.activoId === activo?.id)
    expect(ledger.length).toBeGreaterThan(0)
    for (const c of ledger) expect(c.fuente.length).toBeGreaterThan(0)
    expect(costoAcumulado(activos.ledger, activo!.id)).toBe(0) // mock: costo 0 declarado
  })

  it('regenerar un bloque appendea versión nueva SOLO si el contenido cambió', async () => {
    const casoId = usePreDiscoveryStore.getState().crearCaso('lead-test-3', INTAKE_GAL)
    await correrPipeline(casoId)
    const activoId = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId)?.activoId
    const versionesAntes = useActivosStore.getState().activos.find((a) => a.id === activoId)?.versiones.length ?? 0
    // Re-correr el mismo pipeline mock: mismo contenido → sin versiones nuevas (hash igual).
    await correrPipeline(casoId)
    const versionesDespues = useActivosStore.getState().activos.find((a) => a.id === activoId)?.versiones.length ?? 0
    expect(versionesDespues).toBe(versionesAntes)
  })
})
