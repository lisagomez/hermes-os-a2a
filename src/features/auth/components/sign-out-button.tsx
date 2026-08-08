/**
 * Salir: form nativo que hace POST a /auth/signout (sin JS en cliente).
 */
export function SignOutButton({ email }: { email?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {email && (
        <span className="hidden text-xs text-ink-secondary sm:inline" title={email}>
          {email}
        </span>
      )}
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded px-3 py-1 text-sm text-ink-secondary hover:bg-surface-muted hover:text-ink"
        >
          Salir
        </button>
      </form>
    </div>
  )
}
