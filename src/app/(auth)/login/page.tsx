import { LoginForm } from '@/features/auth/components/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; error?: string }>
}) {
  const { denied, error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink-muted">
            Hermes OS · A2A
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Mission Control</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Acceso restringido al equipo. Te enviamos un enlace a tu correo.
          </p>
        </div>

        {denied && (
          <p className="rounded-lg border border-danger-muted bg-danger-muted px-4 py-3 text-center text-sm text-danger">
            Tu correo no tiene acceso a este panel. Pídele a la administradora
            que te agregue.
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-warning-muted bg-warning-muted px-4 py-3 text-center text-sm text-warning">
            El enlace expiró o no es válido. Solicita uno nuevo.
          </p>
        )}

        <LoginForm />
      </div>
    </div>
  )
}
