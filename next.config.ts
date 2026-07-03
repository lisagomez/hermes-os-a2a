import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Imagen Docker minima para el servicio a2abot (Mission Control, Fase 4)
  output: 'standalone',
  // Activa el MCP server en /_next/mcp (Next.js 16+)
  experimental: {
    mcpServer: true,
  },
}

export default nextConfig
