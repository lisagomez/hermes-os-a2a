import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  // Monorepo con varios lockfiles: sin esto, Turbopack infiere la raíz en el repo
  // y arrastra el src/middleware.ts de la app raíz (Mission Control de infra).
  // __dirname (el config se compila a CJS, patrón de cliente-web2) y no
  // process.cwd(): la raíz es la de ESTA app aunque el build se invoque desde otro cwd.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
