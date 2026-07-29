'use client'

// Formulario compartido de asesor (crear y editar). Reglas: el slug se genera
// del nombre SOLO al crear (editar no lo toca: los enlaces /reservar/[slug]
// repartidos no deben romperse); un asesor nuevo nace sin franjas — su agenda
// se configura en "Ver agenda" (semáforo 'sin_agenda' honesto mientras tanto).

import { useState } from 'react'
import { Button, PillToggle } from '@/shared/components/ui'
import { nuevoId, slugificar } from '@/shared/lib/format'
import type { Asesor, TipoAsesor } from './types'
import { TENANT_DEFAULT } from './types'
import { useAgendaStore } from './store'

const ZONAS = ['America/Mexico_City', 'America/Bogota', 'America/New_York', 'Europe/Madrid'] as const
const DURACIONES = [30, 45, 60] as const
const BUFFERS = [0, 10, 15] as const

function iniciales(nombre: string): string {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export function FormularioAsesor({ existente, onGuardado, onCancelar }: { existente: Asesor | null; onGuardado: (asesor: Asesor) => void; onCancelar: () => void }) {
  const asesores = useAgendaStore((s) => s.asesores)
  const crearAsesor = useAgendaStore((s) => s.crearAsesor)
  const actualizarAsesor = useAgendaStore((s) => s.actualizarAsesor)

  const [nombre, setNombre] = useState(existente?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoAsesor>(existente?.tipo ?? 'humano')
  const [especialidad, setEspecialidad] = useState(existente?.especialidad ?? '')
  const [idiomas, setIdiomas] = useState(existente?.idiomas.join(', ') ?? 'es')
  const [bio, setBio] = useState(existente?.bio ?? '')
  const [zonaHoraria, setZonaHoraria] = useState(existente?.zonaHoraria ?? 'America/Mexico_City')
  const [duracion, setDuracion] = useState<30 | 45 | 60>(existente?.duracionDefaultMin ?? 30)
  const [buffer, setBuffer] = useState(existente?.bufferMin ?? 10)

  const valido = nombre.trim() !== '' && especialidad.trim() !== ''

  const guardar = () => {
    const listaIdiomas = idiomas
      .split(',')
      .map((i) => i.trim().toLowerCase())
      .filter(Boolean)
    if (existente) {
      const cambios: Partial<Asesor> = {
        nombre: nombre.trim(),
        tipo,
        especialidad: especialidad.trim(),
        idiomas: listaIdiomas,
        bio: bio.trim(),
        zonaHoraria,
        duracionDefaultMin: duracion,
        bufferMin: buffer,
        avatarIniciales: iniciales(nombre),
      }
      actualizarAsesor(existente.id, cambios)
      onGuardado({ ...existente, ...cambios })
      return
    }
    // Slug único: si el nombre colisiona, se sufija (los slugs son URLs públicas).
    const base = slugificar(nombre) || 'asesor'
    const ocupados = new Set(asesores.map((a) => a.slug))
    let slug = base
    for (let n = 2; ocupados.has(slug); n++) slug = `${base}-${n}`
    const nuevo: Asesor = {
      id: nuevoId('asesor'),
      slug,
      tenantId: TENANT_DEFAULT,
      tipo,
      nombre: nombre.trim(),
      especialidad: especialidad.trim(),
      idiomas: listaIdiomas,
      rating: null, // sin datos: no se inventa
      bio: bio.trim(),
      zonaHoraria,
      duracionDefaultMin: duracion,
      bufferMin: buffer,
      activo: true,
      avatarIniciales: iniciales(nombre),
    }
    crearAsesor(nuevo)
    onGuardado(nuevo)
  }

  return (
    <div className="space-y-3" data-testid="formulario-asesor">
      <div className="flex flex-wrap items-center gap-3">
        <PillToggle
          opciones={[
            { id: 'humano', contenido: 'Humano' },
            { id: 'ia', contenido: 'IA' },
          ]}
          valor={tipo}
          onCambio={(v) => setTipo(v as TipoAsesor)}
          etiqueta="Tipo de asesor"
          claseBoton="px-3 py-1 text-[12px]"
        />
        <select value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)} className="input w-auto" aria-label="Zona horaria">
          {ZONAS.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre *" className="input" maxLength={120} aria-label="Nombre" data-testid="asesor-nombre" />
      <input value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} placeholder="Especialidad *" className="input" maxLength={160} aria-label="Especialidad" data-testid="asesor-especialidad" />
      <input value={idiomas} onChange={(e) => setIdiomas(e.target.value)} placeholder="Idiomas (coma-separados: es, en)" className="input" aria-label="Idiomas" />
      <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio corta" className="input" maxLength={300} aria-label="Bio" />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-ink-secondary">Sesión</p>
          <PillToggle
            opciones={DURACIONES.map((d) => ({ id: String(d), contenido: `${d} min` }))}
            valor={String(duracion)}
            onCambio={(v) => setDuracion(Number(v) as 30 | 45 | 60)}
            etiqueta="Duración de sesión"
            claseBoton="px-2.5 py-1 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-ink-secondary">Buffer</p>
          <PillToggle
            opciones={BUFFERS.map((b) => ({ id: String(b), contenido: `${b} min` }))}
            valor={String(buffer)}
            onCambio={(v) => setBuffer(Number(v))}
            etiqueta="Buffer entre citas"
            claseBoton="px-2.5 py-1 text-[12px]"
          />
        </div>
      </div>
      {!existente ? (
        <p className="text-[11px] text-ink-muted">El asesor nace sin franjas de atención: configúralas en “Ver agenda” (mientras tanto su semáforo dirá “Sin agenda”, honesto).</p>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button tamano="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button variante="primary" tamano="sm" disabled={!valido} onClick={guardar} data-testid="guardar-asesor">
          {existente ? 'Guardar cambios' : 'Crear asesor'}
        </Button>
      </div>
    </div>
  )
}
