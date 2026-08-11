'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/shared/components/ui'
import { Stepper } from '@/shared/components/stepper'
import { HermesTag } from '@/shared/components/confianza'
import { submitContractIntake } from '@/features/contratos/services'
import type {
  BorradorIntakeContrato,
  TipoContrato,
} from '@/features/contratos/types'

/**
 * ContractIntakeForm — intake de operación contractual.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §3): flujos lentos desde el
 * arranque; captura partes, tipo, jurisdicciones, monto y riesgos clave, y
 * Hermes propone el precedente base al enviarse.
 */

const PASOS = ['Partes', 'Operación', 'Riesgos clave', 'Revisión']

const TIPOS: TipoContrato[] = [
  'Suministro',
  'Prestación de servicios',
  'Arrendamiento',
  'Confidencialidad (NDA)',
  'Distribución',
]

const RIESGOS_CLAVE = [
  'Datos personales',
  'Propiedad intelectual',
  'Exclusividad / competencia económica',
  'Moneda extranjera',
  'Garantías y penas convencionales',
  'Multijurisdicción',
]

const BORRADOR_INICIAL: BorradorIntakeContrato = {
  nombre: '',
  tipo: TIPOS[0],
  parteA: '',
  parteB: '',
  jurisdicciones: 'México',
  monto: '',
  riesgosClave: [],
}

const CLASE_INPUT =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none'

const CLASE_ETIQUETA = 'mb-1 block text-sm font-medium text-ink'

export function ContractIntakeForm() {
  const [paso, setPaso] = useState(0)
  const [borrador, setBorrador] = useState<BorradorIntakeContrato>(BORRADOR_INICIAL)
  const [folio, setFolio] = useState<string | null>(null)

  function actualizar<K extends keyof BorradorIntakeContrato>(
    campo: K,
    valor: BorradorIntakeContrato[K],
  ) {
    setBorrador((previo) => ({ ...previo, [campo]: valor }))
  }

  function alternarRiesgo(riesgo: string) {
    setBorrador((previo) => ({
      ...previo,
      riesgosClave: previo.riesgosClave.includes(riesgo)
        ? previo.riesgosClave.filter((r) => r !== riesgo)
        : [...previo.riesgosClave, riesgo],
    }))
  }

  async function enviar() {
    const respuesta = await submitContractIntake(borrador)
    setFolio(respuesta.folio)
  }

  if (folio) {
    return (
      <Card className="max-w-xl">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={22}
            strokeWidth={1.75}
            aria-hidden
            className="mt-0.5 shrink-0 text-accent"
          />
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              Operación registrada — folio {folio}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm leading-relaxed text-ink-secondary">
              <HermesTag />
              <span>
                Hermes propondrá el precedente base y disparará la evaluación
                del grafo regulatorio sobre los riesgos declarados.
              </span>
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const puedeAvanzar =
    paso === 0
      ? borrador.parteA.trim() !== '' && borrador.parteB.trim() !== ''
      : paso === 1
        ? borrador.nombre.trim() !== '' && borrador.monto.trim() !== ''
        : true

  return (
    <div className="max-w-xl space-y-6">
      <Stepper pasos={PASOS} actual={paso} />

      <Card>
        {paso === 0 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="parte-a" className={CLASE_ETIQUETA}>
                Parte A (cliente del despacho)
              </label>
              <input
                id="parte-a"
                type="text"
                className={CLASE_INPUT}
                placeholder="Grupo Ejemplo, S.A. de C.V."
                value={borrador.parteA}
                onChange={(e) => actualizar('parteA', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="parte-b" className={CLASE_ETIQUETA}>
                Parte B (contraparte)
              </label>
              <input
                id="parte-b"
                type="text"
                className={CLASE_INPUT}
                placeholder="Proveedora Industrial, S.A."
                value={borrador.parteB}
                onChange={(e) => actualizar('parteB', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="jurisdicciones" className={CLASE_ETIQUETA}>
                Jurisdicciones involucradas
              </label>
              <input
                id="jurisdicciones"
                type="text"
                className={CLASE_INPUT}
                value={borrador.jurisdicciones}
                onChange={(e) => actualizar('jurisdicciones', e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {paso === 1 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre-op" className={CLASE_ETIQUETA}>
                Nombre de la operación
              </label>
              <input
                id="nombre-op"
                type="text"
                className={CLASE_INPUT}
                placeholder="Suministro de componentes 2026–2028"
                value={borrador.nombre}
                onChange={(e) => actualizar('nombre', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tipo-contrato" className={CLASE_ETIQUETA}>
                Tipo de contrato
              </label>
              <select
                id="tipo-contrato"
                className={CLASE_INPUT}
                value={borrador.tipo}
                onChange={(e) => actualizar('tipo', e.target.value as TipoContrato)}
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="monto" className={CLASE_ETIQUETA}>
                Monto estimado
              </label>
              <input
                id="monto"
                type="text"
                className={CLASE_INPUT}
                placeholder="MXN $10,000,000"
                value={borrador.monto}
                onChange={(e) => actualizar('monto', e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {paso === 2 ? (
          <fieldset>
            <legend className={CLASE_ETIQUETA}>
              Riesgos clave de la operación (opcional)
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {RIESGOS_CLAVE.map((riesgo) => (
                <label
                  key={riesgo}
                  className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink-secondary has-checked:border-accent has-checked:bg-accent-muted has-checked:text-accent"
                >
                  <input
                    type="checkbox"
                    checked={borrador.riesgosClave.includes(riesgo)}
                    onChange={() => alternarRiesgo(riesgo)}
                  />
                  {riesgo}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {paso === 3 ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-ink-muted">Operación</dt>
              <dd className="text-ink">
                {borrador.nombre} — {borrador.tipo}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Partes</dt>
              <dd className="text-ink">
                {borrador.parteA} ↔ {borrador.parteB}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Jurisdicciones</dt>
              <dd className="text-ink">{borrador.jurisdicciones}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Monto</dt>
              <dd className="text-ink">{borrador.monto}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Riesgos declarados</dt>
              <dd className="text-ink">
                {borrador.riesgosClave.length > 0
                  ? borrador.riesgosClave.join(', ')
                  : 'Ninguno declarado (el grafo evaluará de oficio)'}
              </dd>
            </div>
          </dl>
        ) : null}
      </Card>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setPaso((p) => Math.max(0, p - 1))}
          disabled={paso === 0}
          className="rounded-control border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        {paso < PASOS.length - 1 ? (
          <button
            type="button"
            onClick={() => setPaso((p) => p + 1)}
            disabled={!puedeAvanzar}
            className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={enviar}
            className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Registrar operación
          </button>
        )}
      </div>
    </div>
  )
}
