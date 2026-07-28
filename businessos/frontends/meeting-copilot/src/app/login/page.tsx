import { LoginForm } from '@/features/auth/LoginForm'
import { Card } from '@/shared/components/ui'

/**
 * Página pública de acceso. El AppShell la renderiza SIN sidebar/topbar
 * (ver el escape por pathname en AppShell). Estados de error honestos:
 * denied (fuera de la allowlist), error=auth (enlace inválido/expirado),
 * error=config (auth sin configurar → fail-closed, nadie entra).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; error?: string }>
}) {
  const { denied, error } = await searchParams

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink-muted">
            Hermes OS · A2A
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Meeting Copilot</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Acceso restringido al equipo. Te enviamos un enlace a tu correo.
          </p>
        </div>

        {denied && (
          <p
            className="rounded-m border border-danger bg-danger-muted px-4 py-3 text-center text-sm text-danger"
            role="alert"
          >
            Tu correo no tiene acceso a esta herramienta. Pídele a la
            administradora que te agregue.
          </p>
        )}
        {error === 'auth' && (
          <p
            className="rounded-m border border-warning bg-warning-muted px-4 py-3 text-center text-sm text-warning"
            role="alert"
          >
            El enlace expiró o no es válido. Solicita uno nuevo.
          </p>
        )}
        {error === 'config' && (
          <p
            className="rounded-m border border-warning bg-warning-muted px-4 py-3 text-center text-sm text-warning"
            role="alert"
          >
            La autenticación no está configurada en este entorno, así que el
            acceso está cerrado. Avisa a la administradora.
          </p>
        )}

        <Card className="p-6">
          <LoginForm />
        </Card>
      </div>
    </div>
  )
}
