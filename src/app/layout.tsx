import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hermes OS · A2A — Mission Control',
  description: 'Panel único de Hermes OS · A2A: Pantheon, AI Spend y Grafo (solo lectura)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  )
}
