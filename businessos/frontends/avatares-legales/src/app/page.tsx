import Link from 'next/link'
import { AVATARES } from '@/features/shell/avatares'

/**
 * Portada: selector de avatar.
 *
 * Cada tarjeta responde a un buyer persona de la investigación
 * (INVESTIGACION-SINTESIS.md): a quién sirve, qué dolor ataca y qué vistas
 * ofrece. El catálogo vive en features/shell/avatares.ts (compartido con la
 * barra lateral y las pestañas de cada segmento).
 */
export default function PortadaSelector() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-10">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent">
          HERMES OS · GRAFO REGULATORIO
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
          Avatares legales
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-secondary">
          Cuatro tableros operacionales para despachos: fiscal, litigio,
          contratos y dirección multipráctica. Cada avatar es una capa visible
          sobre Hermes y el grafo regulatorio, diseñada para el rol que la usa.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {AVATARES.map((avatar) => {
          const Icono = avatar.icono
          return (
            <Link
              key={avatar.id}
              href={avatar.vistas[0].href}
              className="group flex flex-col rounded-card border border-line bg-surface p-6 shadow-1 transition-shadow hover:shadow-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-control bg-accent-muted text-accent">
                  <Icono size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink group-hover:text-accent">
                    {avatar.nombre}
                  </h2>
                  <p className="text-sm text-ink-muted">{avatar.persona}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                {avatar.dolor}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {avatar.vistas.map((vista) => (
                  <li
                    key={vista.href}
                    className="rounded-control bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-secondary"
                  >
                    {vista.etiqueta}
                  </li>
                ))}
              </ul>
            </Link>
          )
        })}
      </section>

      <footer className="mt-14 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted">
        Prototipo de producto — no constituye asesoría legal. Todo criterio que
        el sistema muestre cita su fuente y queda sujeto a validación humana
        antes de usarse con un cliente.
      </footer>
    </div>
  )
}
