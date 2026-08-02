// @vitest-environment node
// Integración del asistente de configuración (§11) contra el store real:
// crear → elegir plantilla → verificar (polling) → espejo automático →
// activar (bloqueado hasta el mínimo) → firmar → pausar/reanudar/desconectar.
import { beforeEach, describe, expect, it } from 'vitest'
import { useBuzonStore } from './store'
import { VERIFICACIONES_CONFIGURACION } from './verificacion'

beforeEach(() => {
  useBuzonStore.setState(useBuzonStore.getInitialState(), true)
})

const T0 = '2026-08-01T00:00:00.000Z'

function crear() {
  const r = useBuzonStore.getState().crearBuzonBorrador('nuevo@a2a.mx', 'google')
  if (!r.ok) throw new Error(r.motivo)
  return r.buzonId
}

describe('asistente de configuración — integración con el store', () => {
  it('crear buzón queda en borrador con las 8 verificaciones en pendiente', () => {
    const id = crear()
    const buzon = useBuzonStore.getState().buzones.find((b) => b.id === id)
    expect(buzon?.estado).toBe('borrador')
    expect(useBuzonStore.getState().verificaciones[id]).toHaveLength(8)
    expect(useBuzonStore.getState().verificaciones[id].every((v) => v.estado === 'pendiente')).toBe(true)
  })

  it('elegir plantilla mueve a configurando y verifica política de inmediato', () => {
    const id = crear()
    const r = useBuzonStore.getState().elegirPlantilla(id, 'ventas', true)
    expect(r.ok).toBe(true)
    const buzon = useBuzonStore.getState().buzones.find((b) => b.id === id)!
    expect(buzon.estado).toBe('configurando')
    expect(buzon.modoContraparte).toBe('abierto_cuarentena')
    expect(buzon.captarLeads).toBe(true)
    const politica = useBuzonStore.getState().verificaciones[id].find((v) => v.id === 'politica_buzon')
    expect(politica?.estado).toBe('verificado')
  })

  it('no se puede saltar espejo: avanzar solo las de configuración entra a espejo SOLO, sin botón', () => {
    const id = crear()
    useBuzonStore.getState().elegirPlantilla(id, 'soporte', false)
    useBuzonStore.getState().asignarAprobador(id, 'Ana — PM', 'panel', null, T0)

    // Avanza las 7 verificaciones de configuración: dos pasos cada una (pendiente→en_curso→verificado).
    for (const v of VERIFICACIONES_CONFIGURACION) {
      if (v === 'politica_buzon') continue // ya verificada por elegirPlantilla
      useBuzonStore.getState().avanzarVerificacion(id, v, T0)
      useBuzonStore.getState().avanzarVerificacion(id, v, T0)
    }

    const buzon = useBuzonStore.getState().buzones.find((b) => b.id === id)!
    expect(buzon.estado).toBe('espejo')
    expect(buzon.espejoDesde).toBe(T0)
  })

  it('solicitar activación se bloquea hasta cumplir 7 días + 20 borradores (usa buzon-soporte demo: día 5, 38 borradores)', () => {
    // buzon-soporte demo entró a espejo el 2026-07-28T16:00; a 2 días de eso
    // todavía no cumple el mínimo de 7 días naturales (aunque ya tenga 38
    // borradores en el fixture — ambas condiciones son obligatorias).
    const rNoCumple = useBuzonStore.getState().solicitarActivacion('buzon-soporte', '2026-07-30T16:00:00.000Z')
    expect(rNoCumple.ok).toBe(false)

    // 8 días después de espejoDesde (2026-07-28T16:00) sí cumple los días; el
    // fixture ya trae 38 borradores (≥20) en METRICAS_ESPEJO_DEMO.
    const rCumple = useBuzonStore.getState().solicitarActivacion('buzon-soporte', '2026-08-06T16:00:00.000Z')
    expect(rCumple.ok).toBe(true)
    expect(useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-soporte')?.estado).toBe('listo')
  })

  it('firmar activación exige nombre y deja el buzón activo', () => {
    useBuzonStore.getState().solicitarActivacion('buzon-soporte', '2026-08-06T16:00:00.000Z')
    const r = useBuzonStore.getState().firmarActivacion('buzon-soporte', 'Elisa — CEO', '2026-08-06T16:05:00.000Z')
    expect(r.ok).toBe(true)
    const buzon = useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-soporte')!
    expect(buzon.estado).toBe('activo')
    expect(buzon.activadoPor).toBe('Elisa — CEO')
    expect(buzon.activo).toBe(true)
  })

  it('pausar/reanudar/desconectar sobre un buzón activo real (buzon-ventas)', () => {
    const pausa = useBuzonStore.getState().pausarBuzon('buzon-ventas', T0)
    expect(pausa.ok).toBe(true)
    expect(useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-ventas')?.estado).toBe('pausado')

    const reanuda = useBuzonStore.getState().reanudarBuzon('buzon-ventas', T0)
    expect(reanuda.ok).toBe(true)
    expect(useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-ventas')?.estado).toBe('activo')

    const desconecta = useBuzonStore.getState().desconectarBuzon('buzon-ventas', T0)
    expect(desconecta.ok).toBe(true)
    const buzon = useBuzonStore.getState().buzones.find((b) => b.id === 'buzon-ventas')!
    expect(buzon.estado).toBe('desconectado')
    expect(buzon.activo).toBe(false)
  })
})

describe('relajamiento — decisión del cliente sobre la propuesta demo', () => {
  it('la propuesta demo de buzon-ventas/seguimiento está pendiente', () => {
    const propuesta = useBuzonStore.getState().relajamientos.find((r) => r.id === 'relajamiento-ventas-seguimiento')
    expect(propuesta?.estado).toBe('propuesto')
  })

  it('aplicar la propuesta la deja en "aplicado" con quién y cuándo', () => {
    useBuzonStore.getState().decidirRelajamiento('relajamiento-ventas-seguimiento', 'aplicar', 'Ana Ibarra — CEO', T0)
    const propuesta = useBuzonStore.getState().relajamientos.find((r) => r.id === 'relajamiento-ventas-seguimiento')!
    expect(propuesta.estado).toBe('aplicado')
    expect(propuesta.decididoPor).toBe('Ana Ibarra — CEO')
    expect(propuesta.decididoEn).toBe(T0)
  })

  it('revertir registra motivo y fecha', () => {
    useBuzonStore.getState().decidirRelajamiento('relajamiento-ventas-seguimiento', 'aplicar', 'Ana Ibarra — CEO', T0)
    useBuzonStore.getState().revertirRelajamiento('relajamiento-ventas-seguimiento', '2 rechazos consecutivos', '2026-08-05T00:00:00.000Z')
    const propuesta = useBuzonStore.getState().relajamientos.find((r) => r.id === 'relajamiento-ventas-seguimiento')!
    expect(propuesta.estado).toBe('revertido')
    expect(propuesta.revertidoMotivo).toBe('2 rechazos consecutivos')
  })
})

describe('falsos positivos — "Esto es un falso positivo" (§11.10)', () => {
  it('reportar un gate lo agrega a la lista y a la bitácora', () => {
    const antes = useBuzonStore.getState().falsosPositivos.length
    useBuzonStore.getState().reportarFalsoPositivo('buzon-ventas', 'urls_de_dominio', 'cliente@a2a.mx', T0, { correoId: 'saliente-precio' })
    expect(useBuzonStore.getState().falsosPositivos.length).toBe(antes + 1)
    const reportado = useBuzonStore.getState().falsosPositivos.at(-1)!
    expect(reportado.gate).toBe('urls_de_dominio')
    expect(reportado.correoId).toBe('saliente-precio')
  })
})
