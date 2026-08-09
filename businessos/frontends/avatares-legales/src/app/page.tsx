import Link from 'next/link'
import {
  FileSignature,
  Gavel,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

/**
 * Portada: selector de avatar.
 *
 * Cada tarjeta responde a un buyer persona de la investigación
 * (INVESTIGACION-SINTESIS.md): a quién sirve, qué dolor ataca y qué vistas
 * ofrece. Los enlaces llevan al tablero de cada avatar (fases F3–F6).
 */

type Avatar = {
  href: string
  icono: LucideIcon
  nombre: string
  persona: string
  dolor: string
  vistas: string[]
}

const AVATARES: Avatar[] = [
  {
    href: '/fiscal',
    icono: Landmark,
    nombre: 'Avatar Fiscal',
    persona: 'Socios y equipo fiscal',
    dolor:
      'Criterios dispersos, tiempo perdido en documentos repetitivos y poca visibilidad de los casos con mayor riesgo ante cambios normativos.',
    vistas: ['Intake guiado', 'Criterios aplicables', 'Alertas regulatorias', 'Resumen de caso'],
  },
  {
    href: '/litigio',
    icono: Gavel,
    nombre: 'Avatar de Litigio',
    persona: 'Coordinación de litigio',
    dolor:
      'Riesgo de perder plazos, sin vista única del pipeline de casos e información procesal repartida en correos y hojas de cálculo.',
    vistas: ['Pipeline de casos', 'Agenda y plazos', 'Checklists por juicio', 'Comunicación'],
  },
  {
    href: '/contratos',
    icono: FileSignature,
    nombre: 'Avatar de Contratos',
    persona: 'Firmas corporativas y comerciales',
    dolor:
      'Flujos contractuales lentos, poca trazabilidad de cláusulas y versiones, y precedentes que nadie encuentra cuando se necesitan.',
    vistas: ['Intake de operación', 'Cláusulas', 'Versiones y aprobaciones', 'Precedentes'],
  },
  {
    href: '/direccion',
    icono: LayoutDashboard,
    nombre: 'Avatar Director',
    persona: 'Socios y gerencia multipráctica',
    dolor:
      'Conocimiento y métricas fragmentados entre áreas: sin vista transversal de casos, carga de trabajo y riesgo agregado del despacho.',
    vistas: ['Panorama 360', 'Departamentos', 'Alertas ejecutivas', 'Clientes estratégicos'],
  },
]

export default function PortadaSelector() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <header className="mb-12">
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
        <p className="mt-3 inline-flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-1 font-mono text-xs text-ink-muted">
          Datos: muestra (mock) — prototipo sin conexión a servicios reales
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {AVATARES.map((avatar) => {
          const Icono = avatar.icono
          return (
            <Link
              key={avatar.href}
              href={avatar.href}
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
                    key={vista}
                    className="rounded-control bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-secondary"
                  >
                    {vista}
                  </li>
                ))}
              </ul>
            </Link>
          )
        })}
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-ink-muted">
        Prototipo de producto — no constituye asesoría legal. Todo criterio que
        el sistema muestre cita su fuente y queda sujeto a validación humana
        antes de usarse con un cliente.
      </footer>
    </main>
  )
}
