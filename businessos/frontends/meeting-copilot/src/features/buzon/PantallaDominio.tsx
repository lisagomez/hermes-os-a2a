'use client'

// Pantalla 3 del asistente (SPEC §11.5): dominio de envío. Nunca una lista de
// registros DNS sin contexto — botón de copiar POR REGISTRO, detección del
// registrador por NS, rango de tiempo esperado explícito, polling visible, y
// el aviso de que el cliente puede cerrar la pestaña (el correo llega solo).

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, Callout } from '@/shared/components/ui'
import type { Buzon } from './types'
import { requierePolling, VERIFICACIONES_DNS, verificacionDe } from './verificacion'
import { useBuzonStore } from './store'

const INTERVALO_POLL_DNS_MS = 30000

const REGISTROS: { id: 'dns_spf' | 'dns_dkim' | 'dns_dmarc'; tipo: string; host: string; valor: string }[] = [
  { id: 'dns_spf', tipo: 'SPF', host: 'agentes', valor: 'v=spf1 include:_spf.a2a-factory.mx ~all' },
  { id: 'dns_dkim', tipo: 'DKIM', host: 'sel._domainkey.agentes', valor: 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...' },
  { id: 'dns_dmarc', tipo: 'DMARC', host: '_dmarc.agentes', valor: 'v=DMARC1; p=reject; rua=mailto:dmarc@a2a-factory.mx' },
]

function CopiarBoton({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <Button
      tamano="sm"
      variante="ghost"
      onClick={() => {
        navigator.clipboard?.writeText(valor).catch(() => {})
        setCopiado(true)
        setTimeout(() => setCopiado(false), 1500)
      }}
      data-testid="copiar-registro"
    >
      {copiado ? <Check className="mr-1 inline h-3 w-3 text-success" /> : <Copy className="mr-1 inline h-3 w-3" />}
      {copiado ? 'Copiado' : 'Copiar'}
    </Button>
  )
}

export function PantallaDominio({ buzon, onListo }: { buzon: Buzon; onListo: () => void }) {
  const verificaciones = useBuzonStore((s) => s.verificaciones[buzon.id] ?? [])
  const avanzarVerificacion = useBuzonStore((s) => s.avanzarVerificacion)
  const [subdominio] = useState(`agentes.${buzon.direccion.split('@')[1] ?? 'suempresa.com'}`)

  const ahora = () => new Date().toISOString()
  const todasVerdes = VERIFICACIONES_DNS.every((id) => verificacionDe(verificaciones, id)?.estado === 'verificado')
  const algunaEnCurso = VERIFICACIONES_DNS.some((id) => requierePolling(verificacionDe(verificaciones, id)?.estado ?? 'pendiente'))

  // Polling automático (§11.2): mientras algún registro esté "en_curso", se
  // reintenta solo cada 30s — el cliente puede cerrar la pestaña.
  useEffect(() => {
    if (!algunaEnCurso) return
    const id = setInterval(() => {
      for (const r of REGISTROS) avanzarVerificacion(buzon.id, r.id, new Date().toISOString())
    }, INTERVALO_POLL_DNS_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algunaEnCurso, buzon.id])

  return (
    <div className="space-y-4" data-testid="pantalla-dominio">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-ink-secondary">Subdominio de envío:</span>
        <span className="font-mono font-medium text-ink" data-testid="subdominio-envio">{subdominio}</span>
      </div>

      <Callout tono="info" variante="inline">
        <p className="text-[12px]">
          Detectamos que tu dominio está en <span className="font-medium">Cloudflare</span> (mock). Edita los registros ahí para que la verificación
          avance sola.
        </p>
      </Callout>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Host</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2" />
              <th className="px-3 py-2 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {REGISTROS.map((r) => {
              const v = verificacionDe(verificaciones, r.id)
              const estado = v?.estado ?? 'pendiente'
              return (
                <tr key={r.id} data-testid={`fila-dns-${r.id}`}>
                  <td className="px-3 py-2 font-medium text-ink">{r.tipo}</td>
                  <td className="px-3 py-2 font-mono">{r.host}</td>
                  <td className="max-w-xs truncate px-3 py-2 font-mono text-ink-secondary" title={r.valor}>{r.valor}</td>
                  <td className="px-3 py-2"><CopiarBoton valor={r.valor} /></td>
                  <td className="px-3 py-2 text-right">
                    {estado === 'verificado' ? (
                      <span className="text-success">✓ verificado</span>
                    ) : estado === 'fallido' ? (
                      <span className="text-danger">✗ falló</span>
                    ) : (
                      <span className="text-ink-muted">⏳ propagando</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {algunaEnCurso ? (
        <p className="text-[11px] text-ink-muted" data-testid="texto-polling-dns">
          Revisando cada 30 s · última revisión hace unos segundos. Suele tardar entre 5 minutos y 2 horas — te avisamos por correo al terminar. Puedes
          cerrar esta pestaña.
        </p>
      ) : null}

      {!algunaEnCurso && !todasVerdes ? (
        <Button
          tamano="sm"
          onClick={() => {
            for (const r of REGISTROS) avanzarVerificacion(buzon.id, r.id, ahora())
          }}
          data-testid="iniciar-verificacion-dns"
        >
          Ya agregué los registros — empezar a verificar
        </Button>
      ) : null}

      <Button variante="primary" disabled={!todasVerdes} onClick={onListo} data-testid="continuar-dominio">
        Continuar
      </Button>
    </div>
  )
}
