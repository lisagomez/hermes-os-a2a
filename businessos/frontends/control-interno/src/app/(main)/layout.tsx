import { redirect } from 'next/navigation'
import { isDesktopAuthBypassFromHeaders } from '@/lib/desktop-auth-server'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const allowLocalDesktop = await isDesktopAuthBypassFromHeaders()

  if (!user && !allowLocalDesktop) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
