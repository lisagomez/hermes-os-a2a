'use client'

// M1 — Catálogo de asesores (humanos + IA como entidades del mismo tipo) con
// CRUD completo: agregar, visualizar, editar y borrar (guard: sin borrar con
// citas activas). El filtro es estado de navegación → vive en la URL (?tipo=),
// regla 2 de hermes-design-integrity.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { UserPlus, Users } from 'lucide-react'
import { Button, Callout, Chip, Dialog, EmptyState, PillToggle, SectionHeader } from '@/shared/components/ui'
import type { Asesor } from './types'
import { ETIQUETA_TIPO_ASESOR } from './types'
import { useAgendaStore } from './store'
import { TarjetaAsesor } from './TarjetaAsesor'
import { FormularioAsesor } from './FormularioAsesor'
import { SemaforoDisponibilidad } from './SemaforoDisponibilidad'

type FiltroTipo = 'todos' | 'humano' | 'ia'

const FILTROS: { id: FiltroTipo; contenido: string }[] = [
  { id: 'todos', contenido: 'Todos' },
  { id: 'humano', contenido: 'Humanos' },
  { id: 'ia', contenido: 'IA' },
]

function FichaAsesor({ asesor }: { asesor: Asesor }) {
  return (
    <div className="space-y-3" data-testid="ficha-asesor">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-accent-ink">
          {asesor.avatarIniciales}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">{asesor.nombre}</p>
          <p className="text-[12px] text-ink-secondary">{asesor.especialidad}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tono={asesor.tipo === 'ia' ? 'info' : 'neutral'}>{ETIQUETA_TIPO_ASESOR[asesor.tipo]}</Chip>
        {asesor.idiomas.map((i) => (
          <Chip key={i}>{i.toUpperCase()}</Chip>
        ))}
        <Chip>{asesor.duracionDefaultMin} min</Chip>
        <Chip>buffer {asesor.bufferMin} min</Chip>
        <Chip>{asesor.rating === null ? 'sin rating' : `★ ${asesor.rating.toFixed(1)}`}</Chip>
      </div>
      {asesor.bio ? <p className="text-[13px] leading-snug text-ink-secondary">{asesor.bio}</p> : null}
      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <dt className="text-ink-muted">Zona horaria</dt>
          <dd className="font-medium text-ink">{asesor.zonaHoraria}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Página de reserva</dt>
          <dd className="font-medium text-ink">/reservar/{asesor.slug}</dd>
        </div>
      </dl>
      <SemaforoDisponibilidad asesor={asesor} />
      <div className="flex justify-end gap-2 border-t border-line-subtle pt-3">
        <Link href={`/asesores/${asesor.id}/agenda`}>
          <Button tamano="sm">Ver agenda</Button>
        </Link>
        <Link href={`/reservar/${asesor.slug}`}>
          <Button variante="primary" tamano="sm">
            Reservar
          </Button>
        </Link>
      </div>
    </div>
  )
}

export function CatalogoAsesores() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const asesores = useAgendaStore((s) => s.asesores)
  const borrarAsesor = useAgendaStore((s) => s.borrarAsesor)

  const [creando, setCreando] = useState(false)
  const [viendo, setViendo] = useState<Asesor | null>(null)
  const [editando, setEditando] = useState<Asesor | null>(null)
  const [borrando, setBorrando] = useState<Asesor | null>(null)
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null)

  const crudo = searchParams.get('tipo')
  const filtro: FiltroTipo = crudo === 'humano' || crudo === 'ia' ? crudo : 'todos'

  const visibles = useMemo(
    () => asesores.filter((a) => a.activo && (filtro === 'todos' || a.tipo === filtro)),
    [asesores, filtro]
  )

  const cambiarFiltro = (v: FiltroTipo) => {
    router.replace(v === 'todos' ? pathname : `${pathname}?tipo=${v}`, { scroll: false })
  }

  const confirmarBorrado = () => {
    if (!borrando) return
    const r = borrarAsesor(borrando.id)
    if (!r.ok) {
      setErrorBorrado(r.motivo)
      return
    }
    setBorrando(null)
    setErrorBorrado(null)
  }

  return (
    <div data-testid="catalogo-asesores">
      <SectionHeader
        titulo="Asesores"
        descripcion="Catálogo de asesores humanos e IA: especialidad, idiomas y disponibilidad derivada de su agenda."
        acciones={
          <>
            <PillToggle
              opciones={FILTROS.map((f) => ({ ...f, testid: `filtro-tipo-${f.id}` }))}
              valor={filtro}
              onCambio={cambiarFiltro}
              etiqueta="Filtrar por tipo de asesor"
              claseBoton="px-3 py-1 text-[12px]"
            />
            <Button variante="primary" tamano="sm" onClick={() => setCreando(true)} data-testid="agregar-asesor">
              <UserPlus className="mr-1 inline h-3.5 w-3.5" /> Agregar asesor
            </Button>
          </>
        }
      />

      <Callout tono="info" variante="inline" className="mb-4">
        <p className="text-[12px] text-ink-secondary">Catálogo demo — datos mock declarados; los horarios sin asesor humano podrán cubrirse por IA (pendiente anotado).</p>
      </Callout>

      {visibles.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Ningún asesor coincide con el filtro"
          descripcion="Cambia el filtro para ver el catálogo completo, o agrega un asesor nuevo."
          accion={
            <Button variante="primary" tamano="sm" onClick={() => setCreando(true)}>
              Agregar asesor
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((a) => (
            <TarjetaAsesor
              key={a.id}
              asesor={a}
              onVer={() => setViendo(a)}
              onEditar={() => setEditando(a)}
              onBorrar={() => {
                setErrorBorrado(null)
                setBorrando(a)
              }}
            />
          ))}
        </div>
      )}

      {/* Agregar */}
      <Dialog abierto={creando} onCerrar={() => setCreando(false)} etiqueta="Agregar asesor" data-testid="dialog-crear-asesor">
        <div className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold text-ink">Agregar nuevo asesor</h3>
          <FormularioAsesor existente={null} onGuardado={() => setCreando(false)} onCancelar={() => setCreando(false)} />
        </div>
      </Dialog>

      {/* Visualizar */}
      <Dialog abierto={viendo !== null} onCerrar={() => setViendo(null)} etiqueta="Ficha del asesor" data-testid="dialog-ver-asesor">
        <div className="p-5">{viendo ? <FichaAsesor asesor={viendo} /> : null}</div>
      </Dialog>

      {/* Editar */}
      <Dialog abierto={editando !== null} onCerrar={() => setEditando(null)} etiqueta="Editar asesor" data-testid="dialog-editar-asesor">
        <div className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold text-ink">Editar a {editando?.nombre}</h3>
          {editando ? (
            <FormularioAsesor existente={editando} onGuardado={() => setEditando(null)} onCancelar={() => setEditando(null)} />
          ) : null}
        </div>
      </Dialog>

      {/* Borrar (guard: citas activas bloquean) */}
      <Dialog abierto={borrando !== null} onCerrar={() => setBorrando(null)} etiqueta="Borrar asesor" data-testid="dialog-borrar-asesor">
        <div className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold text-ink">Borrar a {borrando?.nombre}</h3>
          <p className="text-[13px] text-ink-secondary">
            Desaparece del catálogo y de la página de reserva. Sus citas cerradas conservan su nombre en el historial.
          </p>
          {errorBorrado ? (
            <Callout tono="danger" variante="inline" data-testid="borrar-bloqueado">
              <p className="text-[12px]">{errorBorrado}</p>
            </Callout>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button tamano="sm" onClick={() => setBorrando(null)}>
              Cancelar
            </Button>
            <Button variante="primary" tamano="sm" onClick={confirmarBorrado} data-testid="confirmar-borrar-asesor">
              Borrar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
