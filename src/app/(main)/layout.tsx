import { DepartamentoCombo } from '@/features/dashboard/components/desarrollo/departamento-combo'
import { dataSourceLabel, getDataSource } from '@/features/dashboard/services'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { authDeshabilitada } from '@/lib/auth/auth-disabled'
import { createClient } from '@/lib/supabase/server'
import { NavMovil, SidebarJerarquico } from '@/shared/components/nav/sidebar-jerarquico'
import { AppLauncher } from '@/shared/components/nav/app-launcher'
import { Breadcrumb } from '@/shared/components/nav/breadcrumb'
import { ThemeToggle } from '@/shared/components/theme-toggle'

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
  // Con AUTH_DISABLED no hay Supabase que consultar (dev/smoke mock-first):
  // user null y el header simplemente no pinta el correo.
  const user = authDeshabilitada()
    ? null
    : (await (await createClient()).auth.getUser()).data.user
  return (
    <div className="flex h-dvh overflow-hidden">
      <SidebarJerarquico />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface/60 px-4 py-2">
          <NavMovil />
          <AppLauncher />
          <Breadcrumb />
          <div className="ml-auto flex min-w-0 flex-wrap items-center gap-3">
            {/* El combo se esconde en pantallas angostas: el drawer móvil cubre la navegación. */}
            <div className="hidden sm:block">
              <DepartamentoCombo departamentos={departamentos} />
            </div>
            <ThemeToggle />
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                fuente === 'mock'
                  ? 'bg-warning-muted text-warning'
                  : 'bg-success-muted text-success'
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
