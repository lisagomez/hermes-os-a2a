import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWARegister } from '@/components/pwa-register'

export const metadata: Metadata = {
  title: 'Hermes OS · A2A — Mission Control',
  description: 'Panel único de Hermes OS · A2A: Pantheon, AI Spend y Grafo (solo lectura)',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mission Control',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
