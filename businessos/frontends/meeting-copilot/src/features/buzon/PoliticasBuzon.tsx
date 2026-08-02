'use client'

// /buzon/politicas — política de contrapartes POR BUZÓN (SPEC §4). El modo
// 'abierto' EXIGE firma de riesgo (quién/cuándo/justificación): el Dialog no
// deja guardar sin ella. El guard real vive en el store (politicaValida);
// esto es la capa de UI que nunca deja llegar un submit inválido.

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button, Callout, Card, Chip, Dialog, PillToggle, SectionHeader } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'
import { SchemaFirmaRiesgo, SchemaPoliticaBuzon } from './validacion'
import type { Buzon, ModoContraparte } from './types'
import { DESCRIPCION_MODO_CONTRAPARTE, ETIQUETA_MODO_CONTRAPARTE } from './types'
import { useBuzonStore } from './store'

const MODOS: ModoContraparte[] = ['cerrado', 'abierto_cuarentena', 'abierto']

function DialogFirmaRiesgo({
  abierto,
  onCerrar,
  onFirmar,
}: {
  abierto: boolean
  onCerrar: () => void
  onFirmar: (firma: { riesgoFirmadoPor: string; justificacion: string }) => void
}) {
  const [riesgoFirmadoPor, setRiesgoFirmadoPor] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const confirmar = () => {
    const parsed = SchemaFirmaRiesgo.safeParse({ riesgoFirmadoPor, justificacion })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Datos inválidos.')
    setError(null)
    onFirmar(parsed.data)
    setRiesgoFirmadoPor('')
    setJustificacion('')
  }

  return (
    <Dialog abierto={abierto} onCerrar={onCerrar} etiqueta="Firma de riesgo — modo abierto" data-testid="dialog-firma-riesgo">
      <div className="space-y-3 p-5">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <h3 className="text-[14px] font-semibold text-ink">Firma de riesgo obligatoria</h3>
            <p className="text-[12px] text-ink-secondary">{DESCRIPCION_MODO_CONTRAPARTE.abierto}</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[12px] font-medium text-ink-secondary">
            Quién asume el riesgo
            <input
              value={riesgoFirmadoPor}
              onChange={(e) => setRiesgoFirmadoPor(e.target.value)}
              placeholder="Nombre y rol (p. ej. Elisa — CEO)"
              className="input mt-1 w-full text-[13px]"
              data-testid="input-riesgo-firmado-por"
            />
          </label>
          <label className="block text-[12px] font-medium text-ink-secondary">
            Justificación
            <textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Por qué se acepta el riesgo de operar sin allowlist en este buzón"
              className="input mt-1 min-h-20 w-full text-[13px]"
              data-testid="input-justificacion-riesgo"
            />
          </label>
        </div>
        {error ? (
          <Callout tono="danger" variante="inline">
            <p className="text-[12px]">{error}</p>
          </Callout>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button tamano="sm" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primary" tamano="sm" onClick={confirmar} data-testid="confirmar-firma-riesgo">
            Firmar y activar modo abierto
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function PoliticaBuzonForm({ buzon }: { buzon: Buzon }) {
  const actualizarPoliticaBuzon = useBuzonStore((s) => s.actualizarPoliticaBuzon)
  const [modo, setModo] = useState<ModoContraparte>(buzon.modoContraparte)
  const [clasesTexto, setClasesTexto] = useState(buzon.clasesPermitidas.join(', '))
  const [cuotaHora, setCuotaHora] = useState(String(buzon.cuotaHora))
  const [cuotaHilo, setCuotaHilo] = useState(String(buzon.cuotaHilo))
  const [aprobadorRol, setAprobadorRol] = useState(buzon.aprobadorRol)
  const [mostrarFirma, setMostrarFirma] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const elegirModo = (nuevo: ModoContraparte) => {
    setError(null)
    setOk(null)
    setModo(nuevo)
    if (nuevo === 'abierto' && !(buzon.riesgoFirmadoPor && buzon.riesgoFirmadoEn)) setMostrarFirma(true)
  }

  const guardar = (firma?: { riesgoFirmadoPor: string; riesgoFirmadoEn: string; justificacion: string }) => {
    setError(null)
    setOk(null)
    const parsed = SchemaPoliticaBuzon.safeParse({
      clasesPermitidas: clasesTexto.split(',').map((c) => c.trim()).filter(Boolean),
      cuotaHora,
      cuotaHilo,
      aprobadorRol,
    })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Datos inválidos.')
    const r = actualizarPoliticaBuzon(
      buzon.id,
      {
        modoContraparte: modo,
        clasesPermitidas: parsed.data.clasesPermitidas,
        cuotaHora: parsed.data.cuotaHora,
        cuotaHilo: parsed.data.cuotaHilo,
        aprobadorRol: parsed.data.aprobadorRol,
        ...(firma ? { riesgoFirmadoPor: firma.riesgoFirmadoPor, riesgoFirmadoEn: firma.riesgoFirmadoEn } : {}),
      },
      firma ? `Justificación del riesgo: ${firma.justificacion}` : undefined
    )
    if (!r.ok) return setError(r.motivo)
    setOk('Política guardada.')
  }

  return (
    <Card className="space-y-3 p-4" data-testid="politica-buzon" data-buzon={buzon.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-ink">{buzon.direccion}</p>
          <p className="text-[11px] text-ink-muted">{buzon.proveedor} · aprobador rol {buzon.aprobadorRol}</p>
        </div>
        <Chip tono={buzon.activo ? 'success' : 'neutral'}>{buzon.activo ? 'Activo' : 'Inactivo'}</Chip>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Modo de contraparte</p>
        <PillToggle
          variante="suelto"
          opciones={MODOS.map((m) => ({ id: m, contenido: ETIQUETA_MODO_CONTRAPARTE[m], testid: `modo-${buzon.id}-${m}` }))}
          valor={modo}
          onCambio={elegirModo}
          etiqueta={`Modo de contraparte de ${buzon.direccion}`}
          claseBoton="px-2.5 py-1 text-[12px]"
        />
        <p className="mt-1.5 text-[12px] text-ink-secondary">{DESCRIPCION_MODO_CONTRAPARTE[modo]}</p>
        {modo === 'abierto' && buzon.riesgoFirmadoPor ? (
          <p className="mt-1 text-[11px] text-ink-muted">
            Firmado por {buzon.riesgoFirmadoPor}{buzon.riesgoFirmadoEn ? ` · ${fmtFecha(buzon.riesgoFirmadoEn)}` : ''}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-[12px] font-medium text-ink-secondary">
          Clases permitidas
          <input value={clasesTexto} onChange={(e) => setClasesTexto(e.target.value)} className="input mt-1 w-full text-[13px]" data-testid={`clases-${buzon.id}`} />
        </label>
        <label className="block text-[12px] font-medium text-ink-secondary">
          Cuota por hora
          <input type="number" min={1} value={cuotaHora} onChange={(e) => setCuotaHora(e.target.value)} className="input mt-1 w-full text-[13px]" data-testid={`cuota-hora-${buzon.id}`} />
        </label>
        <label className="block text-[12px] font-medium text-ink-secondary">
          Cuota por hilo
          <input type="number" min={1} value={cuotaHilo} onChange={(e) => setCuotaHilo(e.target.value)} className="input mt-1 w-full text-[13px]" data-testid={`cuota-hilo-${buzon.id}`} />
        </label>
      </div>

      <label className="block max-w-xs text-[12px] font-medium text-ink-secondary">
        Rol aprobador (A5)
        <select
          value={aprobadorRol}
          onChange={(e) => setAprobadorRol(e.target.value as Buzon['aprobadorRol'])}
          className="input mt-1 w-full text-[13px]"
          data-testid={`aprobador-rol-${buzon.id}`}
        >
          <option value="PM">PM</option>
          <option value="CEO">CEO</option>
          <option value="CFO">CFO</option>
        </select>
      </label>

      {error ? (
        <Callout tono="danger" variante="inline">
          <p className="text-[12px]">{error}</p>
        </Callout>
      ) : null}
      {ok ? (
        <Callout tono="success" variante="inline">
          <p className="text-[12px]">{ok}</p>
        </Callout>
      ) : null}

      <Button
        variante="primary"
        tamano="sm"
        onClick={() => {
          if (modo === 'abierto' && !(buzon.riesgoFirmadoPor && buzon.riesgoFirmadoEn)) return setMostrarFirma(true)
          guardar()
        }}
        data-testid={`guardar-politica-${buzon.id}`}
      >
        Guardar política
      </Button>

      <DialogFirmaRiesgo
        abierto={mostrarFirma}
        onCerrar={() => {
          setMostrarFirma(false)
          if (!(buzon.riesgoFirmadoPor && buzon.riesgoFirmadoEn)) setModo(buzon.modoContraparte) // sin firma, no se queda en 'abierto'
        }}
        onFirmar={({ riesgoFirmadoPor, justificacion }) => {
          setMostrarFirma(false)
          guardar({ riesgoFirmadoPor, riesgoFirmadoEn: new Date().toISOString(), justificacion })
        }}
      />
    </Card>
  )
}

export function PoliticasBuzon() {
  const buzones = useBuzonStore((s) => s.buzones)
  return (
    <div data-testid="politicas-buzon">
      <SectionHeader
        titulo="Políticas del buzón"
        descripcion="Contrapartes, clases permitidas y cuotas — por buzón, no por organización. El agente jamás crea buzones ni cambia el modo por su cuenta."
      />
      <div className="space-y-4">
        {buzones.map((b) => (
          <PoliticaBuzonForm key={b.id} buzon={b} />
        ))}
      </div>
    </div>
  )
}
