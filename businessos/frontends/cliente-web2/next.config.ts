import type { NextConfig } from 'next';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');

const nextConfig: NextConfig = {
  devIndicators: false,
  // Raíz de tracing = frontends/ (contiene la app Y el paquete local
  // @a2a/design-system, que vive en ../design-system). Fijarla a __dirname
  // dejaría el design-system fuera de la raíz y rompería su resolución.
  // outputFileTracingRoot DEBE coincidir con turbopack.root — si no, Next
  // usa el default de Vercel (la raíz real del monorepo) para ambos, y eso
  // hace que el build de esta app compile por error middleware.ts de OTRA
  // app que vive en esa raíz (visto en Vercel: importaba @/lib/auth/... de
  // Mission Control dentro del build de cliente-web2).
  turbopack: { root: rootDir },
  outputFileTracingRoot: rootDir,
  // El design system es un paquete local con fuente TSX → Next lo transpila.
  transpilePackages: ['@a2a/design-system'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};

export default nextConfig;
