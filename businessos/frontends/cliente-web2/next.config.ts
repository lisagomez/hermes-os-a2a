import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  devIndicators: false,
  // Raíz de tracing = frontends/ (contiene la app Y el paquete local
  // @a2a/design-system, que vive en ../design-system). Fijarla a __dirname
  // dejaría el design-system fuera de la raíz y rompería su resolución.
  turbopack: { root: path.resolve(__dirname, '..') },
  // El design system es un paquete local con fuente TSX → Next lo transpila.
  transpilePackages: ['@a2a/design-system'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};

export default nextConfig;
