import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  output: 'standalone',
  outputFileTracingExcludes: {
    'next-server': [
      'src-tauri/**/*',
      '.git/**/*',
      'coverage/**/*',
    ],
    '/*': [
      'src-tauri/**/*',
      '.git/**/*',
      'coverage/**/*',
    ],
  },
  // Nota: el Segundo Cerebro NO empaqueta el corpus. La memoria/knowledge se lee
  // por ruta ABSOLUTA del filesystem del Mac (BUSINESS_OS_ROOT) en dev y desktop;
  // en web (Vercel) el repo no está montado y la superficie degrada con gracia.
  // (Un outputFileTracingIncludes con glob '../.claude/**' rompe el build de
  // Turbopack: no permite prefijos que salen del project root.)
  // Activa el MCP server en /_next/mcp (Next.js 16+)
  experimental: {
    mcpServer: true,
    // Tree-shaking de barrels pesados (2 jul 2026, pase de fluidez desktop)
    optimizePackageImports: ['recharts', 'lucide-react', 'date-fns', '@fullcalendar/react'],
  },
  // Allow images from Supabase Storage (generated images, avatars, etc.)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/draw2', destination: '/draw3', permanent: true },
      { source: '/draw2/:id', destination: '/draw3/:id', permanent: true },
    ]
  },
  async headers() {
    const allowDesktopEmbed =
      process.env.BUSINESS_OS_DESKTOP_EMBED === '1' ||
      process.env.NODE_ENV === 'development'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const securityHeaders = [
      ...(allowDesktopEmbed
        ? []
        // SAMEORIGIN (no DENY): las hojas HTML del canvas embeben paginas
        // propias en iframe same-origin; DENY las dejaba en blanco (2 jul 2026).
        : [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]),
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      // Preconnect al host de Supabase (si esta configurado) para acelerar el
      // primer fetch de auth/datos.
      ...(supabaseUrl
        ? [{ key: 'Link', value: `<${supabaseUrl}>; rel=preconnect` }]
        : []),
    ]
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
