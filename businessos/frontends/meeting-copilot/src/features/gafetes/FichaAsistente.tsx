'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Callout } from '@/shared/components/ui'
import { DATOS_GAFETE_VACIOS, estaIncompleto, viasDeContacto, type DatosGafete } from './types'

/** Los cuatro campos que Victor confirmó que traen los gafetes van primero y a
 *  ancho completo en móvil: son los que se llenan de pie, con una mano. Los
 *  otros tres quedan detrás de "Más campos" para no alargar el formulario. */
const CAMPOS_PRINCIPALES: { clave: keyof DatosGafete; etiqueta: string; tipo?: string; ejemplo: string }[] = [
  { clave: 'nombre', etiqueta: 'Nombre', ejemplo: 'Marco Díaz' },
  { clave: 'empresa', etiqueta: 'Empresa', ejemplo: 'Translogika SA de CV' },
  { clave: 'email', etiqueta: 'Correo de contacto', tipo: 'email', ejemplo: 'marco@translogika.mx' },
  { clave: 'sitio', etiqueta: 'Sitio web', ejemplo: 'translogika.mx' },
]

const CAMPOS_EXTRA: { clave: keyof DatosGafete; etiqueta: string; ejemplo: string }[] = [
  { clave: 'puesto', etiqueta: 'Puesto', ejemplo: 'Director de Operaciones' },
  { clave: 'telefono', etiqueta: 'Teléfono', ejemplo: '+52 55 1234 5678' },
]

export function FichaAsistente({
  inicial = DATOS_GAFETE_VACIOS,
  textoCrudo,
  onTextoCrudo,
  onGuardar,
  onCancelar,
  etiquetaGuardar = 'Guardar y seguir',
  avisoEmailRepetido,
}: {
  inicial?: DatosGafete
  /** Lo que se escaneó o pegó, tal cual. En la Fase 2 es lo que se teclea o
   *  pega; se conserva íntegro aunque los campos se corrijan. */
  textoCrudo: string
  onTextoCrudo?: (v: string) => void
  onGuardar: (datos: DatosGafete) => void
  onCancelar?: () => void
  etiquetaGuardar?: string
  /** Nombre de otro asistente que ya tiene este mismo correo, si lo hay. */
  avisoEmailRepetido?: string | null
}) {
  const [datos, setDatos] = useState<DatosGafete>(inicial)
  const [verExtra, setVerExtra] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (clave: keyof DatosGafete, valor: string) => setDatos((d) => ({ ...d, [clave]: valor }))

  const guardar = () => {
    if (estaIncompleto(datos)) {
      setError('El nombre es obligatorio: un contacto sin nombre no sirve para volver a buscarlo.')
      return
    }
    setError(null)
    onGuardar({ ...datos, nombre: datos.nombre.trim(), empresa: datos.empresa.trim() })
  }

  const sinContacto = !estaIncompleto(datos) && viasDeContacto(datos) === 0

  return (
    <div className="space-y-3" data-testid="ficha-asistente">
      {onTextoCrudo && (
        <label className="block text-[12px] font-medium text-ink-secondary">
          Contenido del gafete — pega aquí lo que leas del QR, o escríbelo
          <textarea
            value={textoCrudo}
            onChange={(e) => onTextoCrudo(e.target.value)}
            rows={3}
            className="input mt-1 font-mono text-[12px]"
            placeholder={'Marco Díaz\nTranslogika SA de CV\nmarco@translogika.mx'}
            data-testid="input-texto-crudo"
          />
          <span className="mt-1 block text-[11px] text-ink-muted">
            Se guarda tal cual, aunque corrijas los campos: es la evidencia de lo que venía en el gafete.
          </span>
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPOS_PRINCIPALES.map(({ clave, etiqueta, tipo, ejemplo }) => (
          <label key={clave} className="block text-[12px] font-medium text-ink-secondary">
            {etiqueta}
            {clave === 'nombre' && <span className="text-danger"> *</span>}
            <input
              type={tipo ?? 'text'}
              value={datos[clave]}
              onChange={(e) => set(clave, e.target.value)}
              className="input mt-1"
              placeholder={ejemplo}
              data-testid={`gafete-${clave}`}
            />
          </label>
        ))}
      </div>

      {verExtra ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPOS_EXTRA.map(({ clave, etiqueta, ejemplo }) => (
            <label key={clave} className="block text-[12px] font-medium text-ink-secondary">
              {etiqueta}
              <input
                value={datos[clave]}
                onChange={(e) => set(clave, e.target.value)}
                className="input mt-1"
                placeholder={ejemplo}
                data-testid={`gafete-${clave}`}
              />
            </label>
          ))}
          <label className="block text-[12px] font-medium text-ink-secondary sm:col-span-2">
            Notas
            <input
              value={datos.notas}
              onChange={(e) => set('notas', e.target.value)}
              className="input mt-1"
              placeholder="Le interesa el módulo de rutas; volver a buscarlo en octubre"
              data-testid="gafete-notas"
            />
          </label>
        </div>
      ) : (
        <Button variante="ghost" tamano="sm" onClick={() => setVerExtra(true)} data-testid="ver-mas-campos">
          Más campos (puesto, teléfono, notas)
        </Button>
      )}

      {avisoEmailRepetido && (
        <Callout tono="warning" variante="inline" icono={AlertTriangle} data-testid="aviso-email-repetido">
          <p className="text-[12px]">
            Ya hay un contacto con este correo: <strong>{avisoEmailRepetido}</strong>. Puedes guardar igual —
            quizá sea otra persona de la misma empresa— pero revisa antes de escribirle dos veces.
          </p>
        </Callout>
      )}

      {sinContacto && (
        <Callout tono="warning" variante="inline" data-testid="aviso-sin-contacto">
          <p className="text-[12px]">
            Sin correo, teléfono ni sitio web no habrá forma de volver a contactarlo. Se guarda igual, pero
            conviene pedirle alguno antes de que se vaya.
          </p>
        </Callout>
      )}

      {error && (
        <Callout tono="danger" variante="inline" data-testid="error-ficha">
          <p className="text-[12px] text-danger">{error}</p>
        </Callout>
      )}

      <div className="flex gap-2">
        <Button variante="primary" onClick={guardar} data-testid="guardar-gafete">
          {etiquetaGuardar}
        </Button>
        {onCancelar && (
          <Button onClick={onCancelar} data-testid="cancelar-gafete">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}
