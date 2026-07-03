import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Imagen Docker minima para el servicio a2abot (Mission Control, Fase 4)
  output: 'standalone',
  // Raiz EXPLICITA: un package-lock.json huerfano en $HOME hace que Next
  // infiera mal el workspace y aniden .next/standalone (gotcha PRP-004)
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  // Activa el MCP server en /_next/mcp (Next.js 16+)
  experimental: {
    mcpServer: true,
  },
}

export default nextConfig
