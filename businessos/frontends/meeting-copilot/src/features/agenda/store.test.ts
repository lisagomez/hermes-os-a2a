// @vitest-environment node
// CRUD de asesores del catálogo (M1): crear, editar copy-on-write, borrar con
// guard de citas activas y tombstones que preservan el histórico.
import { beforeEach, describe, expect, it } from 'vitest'
import { useAgendaStore } from './store'
import type { Asesor } from './types'
import { TENANT_DEFAULT } from './types'
import { slugificar } from '@/shared/lib/format'

beforeEach(() => {
  useAgendaStore.setState(useAgendaStore.getInitialState(), true)
})

const NUEVO: Asesor = {
  id: 'asesor-test',
  slug: 'maria-prueba',
  tenantId: TENANT_DEFAULT,
  tipo: 'humano',
  nombre: 'María Prueba',
  especialidad: 'Pruebas',
  idiomas: ['es'],
  rating: null,
  bio: '',
  zonaHoraria: 'America/Mexico_City',
  duracionDefaultMin: 30,
  bufferMin: 10,
  activo: true,
  avatarIniciales: 'MP',
}

describe('CRUD de asesores', () => {
  it('crear: el asesor aparece en el catálogo', () => {
    useAgendaStore.getState().crearAsesor(NUEVO)
    expect(useAgendaStore.getState().asesores.some((a) => a.id === 'asesor-test')).toBe(true)
  })

  it('editar un demo es copy-on-write y NUNCA cambia slug ni id', () => {
    useAgendaStore.getState().actualizarAsesor('asesor-ana', { especialidad: 'Nueva especialidad', slug: 'hackeo', id: 'otro' } as Partial<Asesor>)
    const ana = useAgendaStore.getState().asesores.find((a) => a.id === 'asesor-ana')!
    expect(ana.especialidad).toBe('Nueva especialidad')
    expect(ana.slug).toBe('ana-torres') // los enlaces /reservar repartidos no se rompen
    expect(useAgendaStore.getState().asesoresUsuario.some((a) => a.id === 'asesor-ana')).toBe(true) // clonado a usuario
  })

  it('borrar con citas activas se BLOQUEA con motivo (guard)', () => {
    // asesor-ana tiene la solicitud demo activa
    const r = useAgendaStore.getState().borrarAsesor('asesor-ana')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(/activa/)
    expect(useAgendaStore.getState().asesores.some((a) => a.id === 'asesor-ana')).toBe(true)
  })

  it('borrar sin citas activas oculta del catálogo pero el histórico sigue resolviendo el nombre', () => {
    useAgendaStore.getState().crearAsesor(NUEVO)
    const r = useAgendaStore.getState().borrarAsesor('asesor-test')
    expect(r.ok).toBe(true)
    const s = useAgendaStore.getState()
    expect(s.asesores.some((a) => a.id === 'asesor-test')).toBe(false)
    expect(s.asesoresTodos.some((a) => a.id === 'asesor-test')).toBe(true) // resolución histórica
  })

  it('borrar un demo sin citas activas también funciona (tombstone)', () => {
    // asesor-diego no tiene citas en los fixtures
    const r = useAgendaStore.getState().borrarAsesor('asesor-diego')
    expect(r.ok).toBe(true)
    expect(useAgendaStore.getState().asesores.some((a) => a.id === 'asesor-diego')).toBe(false)
  })
})

describe('slugificar (slugs públicos de /reservar)', () => {
  it('kebab-case sin acentos', () => {
    expect(slugificar('Ana Torres')).toBe('ana-torres')
    expect(slugificar('José Núñez  Ruiz')).toBe('jose-nunez-ruiz')
    expect(slugificar('  IA — Técnico 24/7 ')).toBe('ia-tecnico-24-7')
  })
})
