/**
 * Salir: form nativo que hace POST a /auth/signout (sin JS en cliente).
 */
export function SignOutButton({ email }: { email?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {email && (
        <span className="hidden text-xs text-slate-400 sm:inline" title={email}>
          {email}
        </span>
      )}
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded px-3 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Salir
        </button>
      </form>
    </div>
  )
}
