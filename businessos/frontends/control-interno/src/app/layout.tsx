import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Roboto_Slab, Montserrat } from 'next/font/google'
import './globals.css'
import { PWARegister } from '@/components/PWARegister'
import { DesktopReloadShortcut } from '@/components/DesktopReloadShortcut'
import { ThemeProvider } from '@/shared/contexts/theme-context'
import { AuthProvider } from '@/shared/contexts/auth-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-roboto-slab',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem('business-os-theme');
    const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch {
    document.documentElement.classList.add('dark');
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`

export const metadata: Metadata = {
  title: 'business-os-new',
  description: 'AI-first business operating system: talk to your agent, the UI is the mirror',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'business-os-new',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f4f5' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  // NOTE: NO interactiveWidget here. The 26-may (known-good) config did not set
  // it. Adding interactiveWidget:'resizes-content' (jun-6) is what introduced
  // the app-wide bottom black band in the iOS standalone PWA — it left the
  // layout viewport / shell short of the physical screen. Default behaviour
  // (resizes-visual) + the JS --app-h keyboard handling is the working setup.
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable} ${robotoSlab.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Preconnect al proyecto Supabase configurado (si hay env) — ahorra el
            handshake TLS del primer fetch sin hardcodear ningun proyecto. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
        {/* Montserrat literal para canvas2d (ctx.font) — self-hosted en public/fonts/montserrat/
            via @font-face en globals.css. Antes: stylesheet render-blocking a Google Fonts en
            cada arranque (malo para la desktop). */}
        <link
          rel="preload"
          href="/fonts/montserrat/montserrat-latin-600.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <PWARegister />
            <DesktopReloadShortcut />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
