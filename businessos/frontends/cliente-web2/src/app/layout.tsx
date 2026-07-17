import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'A2A Factory — Fábrica de agentes de IA',
  description:
    'Del caso de uso al panel de control. Agentes de IA que atienden a tus clientes, controlan tu presupuesto y proyectan tu negocio — para humanos y por protocolo A2A.',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  openGraph: {
    title: 'A2A Factory — Fábrica de agentes de IA',
    description: 'Del caso de uso al panel de control. Arma tu mazo de agentes.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
