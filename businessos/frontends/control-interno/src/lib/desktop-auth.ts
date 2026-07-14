import type { NextRequest } from 'next/server'

export const LOCAL_DESKTOP_USER_ID = '00000000-0000-4000-8000-000000000001'
export const LOCAL_DESKTOP_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL ?? 'owner@localhost'

export function isLocalHostname(hostname: string | null | undefined) {
  if (!hostname) return false
  const normalized = hostname
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

export function hostnameFromHostHeader(host: string | null) {
  if (!host) return null
  if (host.startsWith('[')) return host.slice(1, host.indexOf(']'))
  return host.split(':')[0] ?? null
}

function hostnameFromRequest(request: Request | NextRequest) {
  if ('nextUrl' in request) return request.nextUrl.hostname
  try {
    return new URL(request.url).hostname
  } catch {
    return hostnameFromHostHeader(request.headers.get('host'))
  }
}

export function isDesktopAuthBypassRequest(request: Request | NextRequest) {
  return (
    process.env.BUSINESS_OS_DESKTOP_EMBED === '1' &&
    isLocalHostname(hostnameFromRequest(request))
  )
}

export function isLocalDesktopUserId(userId: string | null | undefined) {
  return userId === LOCAL_DESKTOP_USER_ID
}
