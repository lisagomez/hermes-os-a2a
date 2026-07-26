import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/shared/contexts/theme-context'
import { AppShell } from '@/features/shell/AppShell'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

// Anti-flash: resuelve el tema desde localStorage ANTES del primer paint.
const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem('meeting-copilot-theme');
    const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
})();
`

export const metadata: Metadata = {
  title: 'Meeting Copilot — Mission Control',
  description:
    'Copiloto comercial de reuniones: transcripción, discovery, guided meeting y follow-ups accionables.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
