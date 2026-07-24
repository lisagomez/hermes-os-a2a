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
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-300">Revisa tu correo</p>
        <p className="mt-2 text-sm text-slate-300">
          Si <span className="font-mono">{email}</span> está autorizado, te
          enviamos un enlace de acceso. Ábrelo en este mismo dispositivo.
        </p>
        <button
          onClick={() => setEstado('idle')}
          className="mt-4 text-sm text-slate-400 underline hover:text-slate-200"
        >
          Usar otro correo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
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
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Enviar enlace de acceso'}
      </button>
      {estado === 'error' && (
        <p className="text-center text-sm text-rose-400">
          No se pudo enviar el enlace. Inténtalo de nuevo en un momento.
        </p>
      )}
    </form>
  )
}
