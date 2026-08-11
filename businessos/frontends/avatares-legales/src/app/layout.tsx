import type { Metadata } from 'next'
import { IBM_Plex_Mono, Libre_Franklin, Source_Serif_4 } from 'next/font/google'
import { AvatarShell } from '@/features/shell/components/avatar-shell'
import './globals.css'

// Las vars de fuente van en <html> (:root), no en <body>: si la var anidada no
// resuelve en el punto de uso, la declaración font-family entera es inválida y
// el navegador cae a serif heredada (gotcha 2026-08-08, Mission Control).
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
})

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-libre-franklin',
  display: 'swap',
})

// IBM Plex Mono no es variable: hay que declarar los pesos.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Avatares Legales · A2A',
  description:
    'Prototipos operacionales de los avatares legales de Hermes OS: fiscal, litigio, contratos y dirección multipráctica. Datos de muestra.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${sourceSerif.variable} ${libreFranklin.variable} ${plexMono.variable}`}
    >
      <body>
        <AvatarShell>{children}</AvatarShell>
      </body>
    </html>
  )
}
