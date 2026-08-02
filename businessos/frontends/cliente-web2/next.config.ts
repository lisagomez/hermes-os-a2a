import type { NextConfig } from 'next';
import path from 'path';

// Raíz de tracing = frontends/ (contiene esta app Y el paquete local
// @a2a/design-system, ../design-system) — la MÍNIMA raíz que los cubre a
// ambos. Ampliarla a la raíz real del repo (3 niveles arriba) parece "más
// correcto" pero rompe esta app: ahí vive el middleware.ts de Mission
// Control, y con una raíz que lo alcanza, Turbopack lo recoge por error
// como si fuera el middleware de ESTA app (probado localmente). Y sin
// outputFileTracingRoot explícito coincidiendo con turbopack.root, Next
// usa el default de Vercel (la raíz real del repo) para ambos — mismo bug.
const rootDir = path.resolve(__dirname, '..');

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: { root: rootDir },
  outputFileTracingRoot: rootDir,
  // El design system es un paquete local con fuente TSX → Next lo transpila.
  transpilePackages: ['@a2a/design-system'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};

export default nextConfig;
