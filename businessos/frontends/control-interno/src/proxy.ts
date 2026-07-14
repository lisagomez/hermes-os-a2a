import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Unificado 2 jul 2026: existian src/middleware.ts y proxy.ts (root) haciendo lo mismo
// con matchers divergentes. Next 16 + src/: el canonico es src/proxy.ts. Matcher = el
// completo (excluye sw.js/manifest para no romper el service worker de la PWA).
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|manifest.json|manifest.webmanifest|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)',
  ],
}
