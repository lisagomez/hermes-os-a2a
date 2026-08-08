import { Card } from '@/shared/components/card'
import type { SaludFlujos } from '../../../types'

/**
 * Empty state honesto del explorador, SIN culpar a la pieza equivocada:
 * - saludFlujos presente → flujos-a2a está VIVO y el caído es el grafo (el
 *   health lo reporta); levantar el perfil a2a no arregla nada ahí.
 * - saludFlujos null → flujos-a2a no respondió ni el health: perfil a2a
 *   apagado, o superficie fuera de hermes-net (a2abot resuelve
 *   flujos-a2a:5100 por DNS interno, no por el túnel SSH).
 */
export function NoDisponible({ saludFlujos }: { saludFlujos: SaludFlujos | null }) {
  if (saludFlujos) {
    return (
      <Card as="section" className="p-10 text-center">
        <p className="text-sm text-ink-secondary">
          flujos-a2a está vivo, pero el grafo no responde.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-xs text-ink-muted">
          Su health reporta: <code className="text-warning">{saludFlujos.grafo}</code>.
          Revisa el contenedor <code>grafo</code> en el runtime (
          <code className="text-ink-secondary">docker compose logs grafo</code>) —
          levantar el perfil a2a no arregla esto.
        </p>
      </Card>
    )
  }
  return (
    <Card as="section" className="p-10 text-center">
      <p className="text-sm text-ink-secondary">flujos-a2a (:5100) no respondió.</p>
      <p className="mx-auto mt-2 max-w-xl text-xs text-ink-muted">
        Esta vista necesita el servicio <code>flujos-a2a</code> corriendo en la
        misma red interna que el panel:{' '}
        <code className="text-ink-secondary">docker compose --profile a2a up -d</code>{' '}
        en el runtime. Las superficies fuera de hermes-net (p. ej. el despliegue
        de Vercel) no tienen acceso a :5100 por diseño — ahí esta vista degrada a
        este aviso, no es un error del panel.
      </p>
    </Card>
  )
}
