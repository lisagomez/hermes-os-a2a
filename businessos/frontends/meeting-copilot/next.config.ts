import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  // Monorepo con varios lockfiles: sin esto, Turbopack infiere la raíz en el repo
  // y arrastra el src/middleware.ts de la app raíz (Mission Control de infra).
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
