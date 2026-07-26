'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Download, FileAudio, Loader2, Share2 } from 'lucide-react'
import { audioDeRegistro, useBitacoraStore, type RegistroBitacora } from './bitacora-store'
import { Card, Chip } from '@/shared/components/ui'
import { fmtDuracion } from '@/shared/lib/format'

function fmtFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function FilaRegistro({ r, discreta }: { r: RegistroBitacora; discreta: boolean }) {
  const [compartido, setCompartido] = useState(false)
  const blob = audioDeRegistro(r.id)

  const descargar = () => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = r.titulo
    a.click()
    URL.revokeObjectURL(url)
  }

  const compartir = async () => {
    const enlace = r.reunionId ? `${window.location.origin}/reuniones/${r.reunionId}/transcripcion` : null
    // Web Share con archivo si el navegador lo permite; si no, enlace/resumen al portapapeles.
    if (blob && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      const file = new File([blob], r.titulo, { type: r.mime })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: r.titulo })
          return
        } catch {
          /* cancelado por el usuario → cae al portapapeles */
        }
      }
    }
    const texto = enlace ?? `Grabación "${r.titulo}" (${fmtFechaHora(r.fechaISO)}, ${fmtDuracion(r.duracionS)})`
    await navigator.clipboard.writeText(texto)
    setCompartido(true)
    setTimeout(() => setCompartido(false), 1600)
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5" data-testid="bitacora-registro">
      <FileAudio className="h-4 w-4 shrink-0 text-ink-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{r.titulo}</p>
        <p className="text-[11px] text-ink-muted">
          {fmtFechaHora(r.fechaISO)} · {fmtDuracion(r.duracionS)}
          {r.asesorNombre && ` · asesor: ${r.asesorNombre}`}
          {r.leadNombre && ` · lead: ${r.leadNombre}`}
        </p>
      </div>

      {r.estado === 'en_transcripcion' ? (
        <Chip tono="info">
          <Loader2 className="h-3 w-3 animate-spin" /> transcribiendo
        </Chip>
      ) : r.estado === 'sesion_guardada' ? (
        <Chip tono="success">sesión analizada</Chip>
      ) : (
        <Chip tono="success">lista</Chip>
      )}
      <Chip>{r.origen === 'sesion_asesor' ? 'con asesor' : 'grabación'}</Chip>

      <div className={`flex items-center gap-1.5 ${discreta ? 'opacity-70' : ''}`}>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-[11px]"
          onClick={descargar}
          disabled={!blob}
          title={blob ? 'Descargar audio' : 'El audio vive en la sesión del navegador: tras recargar ya no está disponible para descarga'}
          data-testid="bitacora-descargar"
        >
          <Download className="h-3 w-3" /> Descargar
        </button>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-[11px]"
          onClick={() => void compartir()}
          title="Compartir archivo (si el navegador lo permite) o copiar enlace"
          data-testid="bitacora-compartir"
        >
          {compartido ? <Check className="h-3 w-3 text-success" /> : <Share2 className="h-3 w-3" />}
          {compartido ? 'Copiado' : 'Compartir'}
        </button>
        {r.reunionId && (
          <Link href={`/reuniones/${r.reunionId}/transcripcion`} className="btn-secondary !px-2 !py-1 text-[11px]">
            Ver transcripción
          </Link>
        )}
      </div>
    </li>
  )
}

/** Bitácora de grabaciones: panel secundario bajo el flujo principal. Durante
 *  una sesión activa se atenúa para no competir con la grabación. */
export function Bitacora({ sesionActiva }: { sesionActiva: boolean }) {
  const registros = useBitacoraStore((s) => s.registros)

  return (
    <Card className={sesionActiva ? 'opacity-60 transition-opacity' : 'transition-opacity'} id="bitacora">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-semibold text-ink">Bitácora de grabaciones</h2>
        <Chip>{registros.length}</Chip>
      </div>
      {registros.length === 0 ? (
        <p className="px-4 py-5 text-[12px] text-ink-secondary" data-testid="bitacora-vacia">
          Aquí quedan tus grabaciones de esta sección, con su descarga, compartir y enlace a la transcripción. Graba tu
          primera sesión para estrenarla.
        </p>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {registros.map((r) => (
            <FilaRegistro key={r.id} r={r} discreta={sesionActiva} />
          ))}
        </ul>
      )}
    </Card>
  )
}
