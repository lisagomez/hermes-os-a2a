import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PWARegister } from '@/components/pwa-register'
import { ThemeProvider } from '@/shared/contexts/theme-context'

// Skin ejecutiva (canon panel-adm): Inter con fallback de sistema. La base
// sigue en 20px (globals.css, pedido de la dueña).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1319' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Anti-flash: resuelve el tema desde localStorage ANTES del primer paint
// (mismo patrón que meeting-copilot; clave propia de esta app).
const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem('mission-control-theme');
    const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background font-sans text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <PWARegister />
      </body>
    </html>
  )
}
