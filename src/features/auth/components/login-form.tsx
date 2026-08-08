'use client'

import { useState } from 'react'

type Estado = 'idle' | 'enviando' | 'enviado' | 'error'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<Estado>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    try {
      const res = await fetch('/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setEstado(res.ok ? 'enviado' : 'error')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'enviado') {
    return (
      <div className="rounded-lg border border-success-muted bg-success-muted p-6 text-center">
        <p className="text-lg font-semibold text-success">Revisa tu correo</p>
        <p className="mt-2 text-sm text-ink-secondary">
          Si <span className="font-mono">{email}</span> está autorizado, te
          enviamos un enlace de acceso. Ábrelo en este mismo dispositivo.
        </p>
        <button
          onClick={() => setEstado('idle')}
          className="mt-4 text-sm text-ink-secondary underline hover:text-ink"
        >
          Usar otro correo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-ink-secondary">
          Correo del equipo
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu.correo@empresa.com"
          className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Enviar enlace de acceso'}
      </button>
      {estado === 'error' && (
        <p className="text-center text-sm text-danger">
          No se pudo enviar el enlace. Inténtalo de nuevo en un momento.
        </p>
      )}
    </form>
  )
}
