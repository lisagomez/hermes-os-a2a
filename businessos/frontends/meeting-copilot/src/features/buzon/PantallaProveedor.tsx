'use client'

// Pantalla 2 del asistente (SPEC §11.4): conectar el proveedor. La detección
// por MX ya ocurrió al crear el buzón (mock: el proveedor se fija ahí, no se
// vuelve a preguntar el correo). Lo que importa de verdad en esta pantalla es
// el PUNTO CRÍTICO: la ruta del administrador cuando el usuario en sesión no
// tiene permiso, y la prueba de control positivo del alcance.

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button, Callout } from '@/shared/components/ui'
import type { Buzon } from './types'
import { ETIQUETA_VERIFICACION, VERIFICACIONES_PROVEEDOR, verificacionDe } from './verificacion'
import type { Verificacion } from './verificacion'
import { useBuzonStore } from './store'
import { VerificacionItem } from './VerificacionItem'

const ETIQUETA_PROVEEDOR: Record<Buzon['proveedor'], string> = {
  m365: 'Microsoft 365',
  google: 'Google Workspace',
  imap: 'IMAP genérico',
}

function CorreoDelegacion({ admin, buzon }: { admin: { nombre: string; correo: string }; buzon: Buzon }) {
  return (
    <div className="rounded-s border border-line-subtle bg-surface-muted p-3 text-[12px] text-ink-secondary" data-testid="correo-delegacion">
      <p className="mb-1 font-semibold text-ink">Vista previa del correo a {admin.nombre} ({admin.correo}):</p>
      <ol className="list-inside list-decimal space-y-1">
        <li>Qué se pide y por qué, en tres renglones sin jerga: autorizar a A2A Factory a leer y responder {buzon.direccion} para automatizar el buzón.</li>
        <li>Enlace de consentimiento ya construido con los scopes exactos (Mail.Read, Mail.Send — restringidos al buzón).</li>
        <li>
          Comando de <code>ApplicationAccessPolicy</code> con el grupo prellenado, copiable, con la advertencia de que sin él la app vería todos los
          buzones.
        </li>
        <li>Enlace para responder dudas a {admin.nombre} — nunca a un buzón genérico.</li>
      </ol>
    </div>
  )
}

export function PantallaProveedor({ buzon, onListo }: { buzon: Buzon; onListo: () => void }) {
  const verificaciones = useBuzonStore((s) => s.verificaciones[buzon.id] ?? [])
  const avanzarVerificacion = useBuzonStore((s) => s.avanzarVerificacion)
  const delegarVerificacion = useBuzonStore((s) => s.delegarVerificacion)
  const resolverDelegacionVerificacion = useBuzonStore((s) => s.resolverDelegacionVerificacion)
  const simularFugaDeAlcance = useBuzonStore((s) => s.simularFugaDeAlcance)
  const [rutaAdmin, setRutaAdmin] = useState<'sin_elegir' | 'soy_admin' | 'delegar'>('sin_elegir')

  const admin = { nombre: 'Roberto Campos', correo: 'ti@' + buzon.direccion.split('@')[1] }
  const ahora = () => new Date().toISOString()

  const consent = verificacionDe(verificaciones, 'oauth_consent')
  const policy = verificacionDe(verificaciones, 'access_policy')
  const lectura = verificacionDe(verificaciones, 'lectura_buzon')
  const todasVerdes = VERIFICACIONES_PROVEEDOR.every((id) => verificacionDe(verificaciones, id)?.estado === 'verificado')

  const poll = (id: Verificacion['id']) => avanzarVerificacion(buzon.id, id, ahora())

  return (
    <div className="space-y-4" data-testid="pantalla-proveedor">
      <p className="text-[13px] text-ink-secondary">
        Detectamos por los registros MX de <span className="font-medium text-ink">{buzon.direccion}</span> que el proveedor es{' '}
        <span className="font-medium text-ink">{ETIQUETA_PROVEEDOR[buzon.proveedor]}</span>.
      </p>

      {rutaAdmin === 'sin_elegir' && consent?.estado === 'pendiente' ? (
        <Callout tono="warning" titulo="Se necesita un administrador" icono={ShieldAlert}>
          <p className="mb-2 text-[12px]">Este paso lo tiene que autorizar un administrador de {ETIQUETA_PROVEEDOR[buzon.proveedor]}.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variante="primary"
              tamano="sm"
              onClick={() => {
                setRutaAdmin('soy_admin')
                poll('oauth_consent')
                poll('access_policy')
              }}
              data-testid="soy-administrador"
            >
              Soy administrador — continuar
            </Button>
            <Button
              tamano="sm"
              onClick={() => {
                setRutaAdmin('delegar')
                delegarVerificacion(buzon.id, 'oauth_consent', admin, ahora())
                delegarVerificacion(buzon.id, 'access_policy', admin, ahora())
              }}
              data-testid="delegar-administrador"
            >
              Enviar instrucciones a mi administrador
            </Button>
          </div>
        </Callout>
      ) : null}

      {rutaAdmin === 'delegar' ? <CorreoDelegacion admin={admin} buzon={buzon} /> : null}

      <div className="space-y-2">
        {[consent, policy, lectura].filter((v): v is Verificacion => Boolean(v)).map((v) => (
          <VerificacionItem
            key={v.id}
            verificacion={v}
            onPoll={() => poll(v.id)}
            onAccion={(accion) => {
              if (accion.tipo === 'delegar') resolverDelegacionVerificacion(buzon.id, v.id, ahora())
              else poll(v.id)
            }}
          />
        ))}
      </div>

      {rutaAdmin === 'delegar' && consent?.estado === 'esperando_tercero' ? (
        <Button tamano="sm" variante="ghost" onClick={() => { resolverDelegacionVerificacion(buzon.id, 'oauth_consent', ahora()); resolverDelegacionVerificacion(buzon.id, 'access_policy', ahora()) }} data-testid="admin-ya-autorizo">
          {admin.nombre} ya autorizó (demo)
        </Button>
      ) : null}

      {policy?.estado === 'verificado' && lectura?.estado !== 'fallido' ? (
        <Button tamano="sm" variante="ghost" onClick={() => simularFugaDeAlcance(buzon.id, ahora())} data-testid="simular-fuga-alcance">
          Simular fuga de alcance (demo — muestra el camino &quot;fallido&quot;)
        </Button>
      ) : null}

      <p className="text-[11px] text-ink-muted">
        Verificación de la restricción de alcance: {ETIQUETA_VERIFICACION.lectura_buzon.toLowerCase()} — no basta con que el consentimiento exista, se
        prueba que el agente NO puede leer un buzón fuera del grupo autorizado.
      </p>

      <Button variante="primary" disabled={!todasVerdes} onClick={onListo} data-testid="continuar-proveedor">
        Continuar
      </Button>
    </div>
  )
}
