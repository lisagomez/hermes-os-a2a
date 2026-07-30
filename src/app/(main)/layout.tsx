import { DepartamentoCombo } from '@/features/dashboard/components/desarrollo/departamento-combo'
import { dataSourceLabel, getDataSource } from '@/features/dashboard/services'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { createClient } from '@/lib/supabase/server'
import { SidebarJerarquico } from '@/shared/components/nav/sidebar-jerarquico'
import { AppLauncher } from '@/shared/components/nav/app-launcher'
import { Breadcrumb } from '@/shared/components/nav/breadcrumb'

// Shell del panel: sidebar jerárquico config-driven (src/shared/nav.config.ts)
// + header delgado con waffle (App Launcher del ecosistema) y breadcrumb
// derivado. El antiguo topbar + fila de subnav se reemplazó — el contenido
// gana una fila de altura. Sigue siendo Server Component: la navegación son
// islas client.

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const fuente = dataSourceLabel()
  const departamentos = await getDataSource().departamentos()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return (
    <div className="flex h-dvh overflow-hidden">
      <SidebarJerarquico />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-2">
          <AppLauncher />
          <Breadcrumb />
          <div className="ml-auto flex items-center gap-3">
            <DepartamentoCombo departamentos={departamentos} />
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                fuente === 'mock'
                  ? 'bg-amber-900/60 text-amber-300'
                  : 'bg-emerald-900/60 text-emerald-300'
              }`}
              title="Fuente de datos activa (DASHBOARD_DATA)"
            >
              datos: {fuente}
            </span>
            <SignOutButton email={user?.email} />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
