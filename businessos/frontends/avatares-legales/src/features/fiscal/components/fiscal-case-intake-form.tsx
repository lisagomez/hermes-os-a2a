'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/shared/components/ui'
import { Stepper } from '@/shared/components/stepper'
import { HermesTag } from '@/shared/components/confianza'
import { submitFiscalCaseIntake } from '@/features/fiscal/services'
import type { BorradorIntakeFiscal, MateriaFiscal } from '@/features/fiscal/types'

/**
 * FiscalCaseIntakeForm — intake guiado de casos fiscales.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §1): procesos de entrada
 * manuales y fragmentados; el formulario por pasos captura lo mínimo y Hermes
 * clasifica el resto (materia/riesgo vía grafo) al enviarse.
 */

const PASOS = ['Cliente', 'Operación', 'Materias', 'Revisión']

const MATERIAS: MateriaFiscal[] = [
  'ISR',
  'IVA',
  'IEPS',
  'CFDI',
  'Precios de transferencia',
  'Comercio exterior',
]

const REGIMENES = [
  'General de Ley Personas Morales',
  'Maquiladora (IMMEX)',
  'RESICO Personas Morales',
  'Personas Físicas con Actividad Empresarial',
  'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
]

const BORRADOR_INICIAL: BorradorIntakeFiscal = {
  cliente: '',
  rfc: '',
  regimen: REGIMENES[0],
  materias: [],
  descripcion: '',
  urgencia: 'normal',
}

const CLASE_INPUT =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none'

const CLASE_ETIQUETA = 'mb-1 block text-sm font-medium text-ink'

export function FiscalCaseIntakeForm() {
  const [paso, setPaso] = useState(0)
  const [borrador, setBorrador] = useState<BorradorIntakeFiscal>(BORRADOR_INICIAL)
  const [folio, setFolio] = useState<string | null>(null)

  function actualizar<K extends keyof BorradorIntakeFiscal>(
    campo: K,
    valor: BorradorIntakeFiscal[K],
  ) {
    setBorrador((previo) => ({ ...previo, [campo]: valor }))
  }

  function alternarMateria(materia: MateriaFiscal) {
    setBorrador((previo) => ({
      ...previo,
      materias: previo.materias.includes(materia)
        ? previo.materias.filter((m) => m !== materia)
        : [...previo.materias, materia],
    }))
  }

  async function enviar() {
    const respuesta = await submitFiscalCaseIntake(borrador)
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
              Caso recibido — folio {folio}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm leading-relaxed text-ink-secondary">
              <HermesTag />
              <span>
                Hermes clasificará la materia y el riesgo inicial con el grafo
                regulatorio y lo asignará al responsable de la práctica.
              </span>
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const puedeAvanzar =
    paso === 0
      ? borrador.cliente.trim() !== '' && borrador.rfc.trim() !== ''
      : paso === 1
        ? borrador.descripcion.trim() !== ''
        : paso === 2
          ? borrador.materias.length > 0
          : true

  return (
    <div className="max-w-xl space-y-6">
      <Stepper pasos={PASOS} actual={paso} />

      <Card>
        {paso === 0 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="cliente" className={CLASE_ETIQUETA}>
                Razón social del cliente
              </label>
              <input
                id="cliente"
                type="text"
                className={CLASE_INPUT}
                placeholder="Grupo Ejemplo, S.A. de C.V."
                value={borrador.cliente}
                onChange={(e) => actualizar('cliente', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="rfc" className={CLASE_ETIQUETA}>
                RFC
              </label>
              <input
                id="rfc"
                type="text"
                className={`${CLASE_INPUT} font-mono uppercase`}
                placeholder="GEJ010203AB4"
                maxLength={13}
                value={borrador.rfc}
                onChange={(e) => actualizar('rfc', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label htmlFor="regimen" className={CLASE_ETIQUETA}>
                Régimen fiscal
              </label>
              <select
                id="regimen"
                className={CLASE_INPUT}
                value={borrador.regimen}
                onChange={(e) => actualizar('regimen', e.target.value)}
              >
                {REGIMENES.map((regimen) => (
                  <option key={regimen} value={regimen}>
                    {regimen}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {paso === 1 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="descripcion" className={CLASE_ETIQUETA}>
                Describe la operación o el asunto
              </label>
              <textarea
                id="descripcion"
                rows={5}
                className={CLASE_INPUT}
                placeholder="Ej. rechazo de deducciones del ejercicio 2024 en revisión de gabinete…"
                value={borrador.descripcion}
                onChange={(e) => actualizar('descripcion', e.target.value)}
              />
            </div>
            <fieldset>
              <legend className={CLASE_ETIQUETA}>Urgencia</legend>
              <div className="flex gap-4">
                {(['normal', 'urgente'] as const).map((nivel) => (
                  <label
                    key={nivel}
                    className="flex items-center gap-2 text-sm text-ink-secondary"
                  >
                    <input
                      type="radio"
                      name="urgencia"
                      checked={borrador.urgencia === nivel}
                      onChange={() => actualizar('urgencia', nivel)}
                    />
                    {nivel === 'normal' ? 'Normal' : 'Urgente (plazo corriendo)'}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {paso === 2 ? (
          <fieldset>
            <legend className={CLASE_ETIQUETA}>
              Materias involucradas (al menos una)
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {MATERIAS.map((materia) => (
                <label
                  key={materia}
                  className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink-secondary has-checked:border-accent has-checked:bg-accent-muted has-checked:text-accent"
                >
                  <input
                    type="checkbox"
                    checked={borrador.materias.includes(materia)}
                    onChange={() => alternarMateria(materia)}
                  />
                  {materia}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {paso === 3 ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-ink-muted">Cliente</dt>
              <dd className="text-ink">
                {borrador.cliente} —{' '}
                <span className="font-mono">{borrador.rfc}</span>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Régimen</dt>
              <dd className="text-ink">{borrador.regimen}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Materias</dt>
              <dd className="text-ink">{borrador.materias.join(', ')}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Asunto</dt>
              <dd className="leading-relaxed text-ink">{borrador.descripcion}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-muted">Urgencia</dt>
              <dd className="text-ink">
                {borrador.urgencia === 'urgente' ? 'Urgente' : 'Normal'}
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
            Enviar caso
          </button>
        )}
      </div>
    </div>
  )
}
