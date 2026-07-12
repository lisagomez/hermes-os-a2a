import Link from 'next/link'
import { dataSourceLabel } from '@/features/dashboard/services'

const vistas = [
  { href: '/dashboard', label: 'Pantheon' },
  { href: '/ai-spend', label: 'AI Spend' },
  { href: '/grafo', label: 'Grafo' },
  { href: '/desarrollo', label: 'Desarrollo' },
]

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const fuente = dataSourceLabel()
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Mission Control
          </span>
          <div className="flex gap-4">
            {vistas.map((v) => (
              <Link
                key={v.href}
                href={v.href}
                className="rounded px-3 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {v.label}
              </Link>
            ))}
          </div>
          <span
            className={`ml-auto rounded-full px-3 py-0.5 text-xs font-semibold ${
              fuente === 'mock'
                ? 'bg-amber-900/60 text-amber-300'
                : 'bg-emerald-900/60 text-emerald-300'
            }`}
            title="Fuente de datos activa (DASHBOARD_DATA)"
          >
            datos: {fuente}
          </span>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
