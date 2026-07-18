import { headers } from 'next/headers'
import { hostnameFromHostHeader, isLocalHostname } from '@/lib/desktop-auth'

export async function isDesktopAuthBypassFromHeaders() {
  const headerStore = await headers()
  return (
    process.env.BUSINESS_OS_DESKTOP_EMBED === '1' &&
    isLocalHostname(hostnameFromHostHeader(headerStore.get('host')))
  )
}
