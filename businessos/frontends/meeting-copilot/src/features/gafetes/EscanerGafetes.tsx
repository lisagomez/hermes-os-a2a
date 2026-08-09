'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CloudOff, QrCode, SearchX, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { useAppStore } from '@/features/domain/store'
import { MeetingHeader } from '@/features/meetings/MeetingHeader'
import {
  Button,
  Callout,
  Card,
  Chip,
  EmptyState,
  SectionHeader,
  Stat,
  TBody,
  TCell,
  TH,
  THead,
  TRow,
  Table,
} from '@/shared/components/ui'
import { fmtHora } from '@/shared/lib/format'
import { ESTADO_AVISO } from './aviso'
import { otroConMismoEmail, pendientesDeSincronizar } from './dedupe'
import { FichaAsistente } from './FichaAsistente'
import { useAsistentesDe, useGafetesStore } from './store'
import { DATOS_GAFETE_VACIOS, viasDeContacto, type AsistenteEvento, type DatosGafete } from './types'

export function EscanerGafetes() {
  const { id } = useParams<{ id: string }>()
  const reunion = useAppStore((s) => s.reuniones.find((r) => r.id === id) ?? null)
  const asistentes = useAsistentesDe(id)
  const capturar = useGafetesStore((s) => s.capturar)
  const corregir = useGafetesStore((s) => s.corregir)
  const eliminar = useGafetesStore((s) => s.eliminar)

  const [textoCrudo, setTextoCrudo] = useState('')
  const [editando, setEditando] = useState<AsistenteEvento | null>(null)
  const [ultimo, setUltimo] = useState<{ nombre: string; repetido: boolean } | null>(null)
  const [emailEnFicha, setEmailEnFicha] = useState('')

  const pendientes = useMemo(() => pendientesDeSincronizar(asistentes), [asistentes])
  const conContacto = useMemo(() => asistentes.filter((a) => viasDeContacto(a.datos) > 0).length, [asistentes])

  const repetidoDe = useMemo(
    () => otroConMismoEmail(asistentes, emailEnFicha, editando?.id ?? 'nuevo'),
    [asistentes, emailEnFicha, editando]
  )

  // Estado vacío, no un 404: los eventos viven en el navegador, así que un
  // enlace abierto en otro dispositivo no encuentra la reunión — y eso hay que
  // explicarlo, no disfrazarlo de "página inexistente".
  if (!reunion) {
    return (
      <EmptyState
        icono={SearchX}
        titulo="Evento no encontrado"
        descripcion="El enlace apunta a un evento que no existe en este navegador. Los contactos capturados todavía no se suben a la base de datos, así que solo se ven en el dispositivo donde se capturaron."
        accion={
          <Link href="/reuniones" className="btn-primary">
            Ver reuniones
          </Link>
        }
      />
    )
  }

  const guardarNuevo = async (datos: DatosGafete) => {
    // Si nadie pegó el contenido del gafete, el texto crudo es lo que se
    // tecleó: sigue siendo la evidencia de esta captura, y es lo que da la
    // huella antiduplicados.
    const crudo = textoCrudo.trim().length > 0 ? textoCrudo : Object.values(datos).filter(Boolean).join('\n')
    const tipo = await capturar({
      reunionId: id,
      textoCrudo: crudo,
      formato: 'crudo',
      datos,
      fuenteDato: 'captura_manual',
    })
    setUltimo({ nombre: datos.nombre, repetido: tipo === 'repetido' })
    setTextoCrudo('')
    setEmailEnFicha('')
  }

  return (
    <div className="space-y-4">
      <MeetingHeader reunion={reunion} />

      {/* Franja de cumplimiento. No es decorativa: mientras no haya aviso
          publicado, capturar contactos para prospección no tiene vía lícita, y
          eso tiene que verse antes de escribir el primer nombre. */}
      {ESTADO_AVISO.configurado ? (
        <Callout tono="info" variante="inline" icono={ShieldCheck} data-testid="aviso-privacidad-ok">
          <p className="text-[12px]">
            Se está registrando el aviso de privacidad <strong>versión {ESTADO_AVISO.version}</strong> en cada
            contacto capturado.{' '}
            <a href={ESTADO_AVISO.url} target="_blank" rel="noreferrer" className="underline">
              Ver el aviso
            </a>
            . Muéstraselo a la persona (cartel o QR del stand) antes de capturar sus datos.
          </p>
        </Callout>
      ) : (
        <Callout tono="danger" icono={ShieldAlert} titulo="Falta el aviso de privacidad" data-testid="aviso-privacidad-falta">
          <p className="text-[12px] text-ink">{ESTADO_AVISO.motivo}</p>
          <p className="mt-1 text-[12px] text-ink-secondary">
            Puedes capturar para probar la pantalla, pero estas filas quedan marcadas como{' '}
            <code className="font-mono">SIN-AVISO</code> y <strong>no deben subirse a la base ni usarse para
            prospección</strong> hasta que el aviso esté publicado y haya alguien atendiendo el buzón de bajas.
          </p>
        </Callout>
      )}

      <SectionHeader
        titulo="Captura de contactos"
        descripcion="Lo que se captura en el evento: nombre, empresa, correo y sitio web. El lector de QR llega en la siguiente fase; por ahora se pega o se escribe."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat etiqueta="Contactos" valor={String(asistentes.length)} />
        <Stat
          etiqueta="Con forma de contactarlos"
          valor={String(conContacto)}
          detalle={asistentes.length > 0 ? `de ${asistentes.length}` : undefined}
          tono={conContacto < asistentes.length ? 'warning' : 'neutral'}
        />
        <Stat
          etiqueta="Sin sincronizar"
          valor={String(pendientes)}
          detalle={pendientes > 0 ? 'solo en este dispositivo' : 'nada pendiente'}
          tono={pendientes > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {pendientes > 0 && (
        <Callout tono="warning" variante="inline" icono={CloudOff} data-testid="aviso-sin-sincronizar">
          <p className="text-[12px]">
            {pendientes} {pendientes === 1 ? 'contacto vive' : 'contactos viven'} solo en este navegador. La
            subida a la base de datos llega en la fase 4 — hasta entonces, no cierres la sesión ni limpies el
            navegador después de un evento.
          </p>
        </Callout>
      )}

      <Card className="space-y-3 p-5">
        <h2 className="text-[13px] font-semibold text-ink">
          {editando ? `Corrigiendo: ${editando.datos.nombre}` : 'Nuevo contacto'}
        </h2>
        {editando ? (
          <FichaAsistente
            key={editando.id}
            inicial={editando.datos}
            textoCrudo={editando.textoCrudo}
            onGuardar={(datos) => {
              corregir(editando.id, datos)
              setEditando(null)
              setEmailEnFicha('')
            }}
            onCancelar={() => {
              setEditando(null)
              setEmailEnFicha('')
            }}
            etiquetaGuardar="Guardar corrección"
            avisoEmailRepetido={repetidoDe?.datos.nombre ?? null}
          />
        ) : (
          <FichaAsistente
            key={`nuevo-${asistentes.length}`}
            textoCrudo={textoCrudo}
            onTextoCrudo={(v) => {
              setTextoCrudo(v)
              setEmailEnFicha('')
            }}
            inicial={DATOS_GAFETE_VACIOS}
            onGuardar={guardarNuevo}
            avisoEmailRepetido={repetidoDe?.datos.nombre ?? null}
          />
        )}
      </Card>

      {ultimo && (
        <Callout
          tono={ultimo.repetido ? 'warning' : 'success'}
          variante="inline"
          data-testid={ultimo.repetido ? 'captura-repetida' : 'captura-guardada'}
        >
          <p className="text-[12px]">
            {ultimo.repetido
              ? `${ultimo.nombre} ya estaba capturado en este evento: se sumó un escaneo en vez de duplicar la fila.`
              : `${ultimo.nombre} quedó capturado. Listo para el siguiente.`}
          </p>
        </Callout>
      )}

      {asistentes.length === 0 ? (
        <EmptyState
          icono={QrCode}
          titulo="Todavía no hay contactos en este evento"
          descripcion="Pega el contenido de un gafete o escribe los datos a mano. El lector de QR con cámara llega en la siguiente fase."
        />
      ) : (
        <Card className="p-0">
          <Table data-testid="tabla-asistentes">
            <THead>
              <TH>Nombre</TH>
              <TH>Empresa</TH>
              <TH>Contacto</TH>
              <TH>Capturado</TH>
              <TH className="text-right">Acciones</TH>
            </THead>
            <TBody>
              {asistentes.map((a) => (
                <TRow key={a.id} data-testid={`fila-asistente-${a.id}`}>
                  <TCell>
                    <span className="font-medium text-ink">{a.datos.nombre}</span>
                    {a.corregido && <Chip>corregido</Chip>}
                    {a.escaneos > 1 && <Chip tono="warning">{a.escaneos} escaneos</Chip>}
                  </TCell>
                  <TCell>{a.datos.empresa || <span className="text-ink-muted">—</span>}</TCell>
                  <TCell>
                    <span className="block text-[12px]">{a.datos.email || <span className="text-ink-muted">sin correo</span>}</span>
                    {a.datos.sitio && <span className="block text-[11px] text-ink-secondary">{a.datos.sitio}</span>}
                  </TCell>
                  <TCell className="text-[12px] text-ink-secondary">
                    {fmtHora(a.capturadoAt)}
                    {a.avisoVersion === 'SIN-AVISO' && <Chip tono="danger">sin aviso</Chip>}
                  </TCell>
                  <TCell className="text-right">
                    <Button tamano="sm" onClick={() => setEditando(a)} data-testid={`editar-${a.id}`}>
                      Corregir
                    </Button>
                    <Button
                      tamano="sm"
                      variante="ghost"
                      onClick={() => eliminar(a.id)}
                      data-testid={`eliminar-${a.id}`}
                      title="Eliminar este contacto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TCell>
                </TRow>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
