import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  devIndicators: false,
  // Raíz de tracing = frontends/ (contiene la app y @a2a/design-system).
  turbopack: { root: path.resolve(__dirname, '..') },
  transpilePackages: ['@a2a/design-system'],
};

export default nextConfig;
