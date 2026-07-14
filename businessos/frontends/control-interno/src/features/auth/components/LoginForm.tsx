'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { login } from '@/actions/auth'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [returnTo, setReturnTo] = useState('/')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setError('Access denied. Your account is not authorized.')
    }
    // Priority: URL ?next= param (from middleware) > localStorage (fallback)
    const nextParam = searchParams.get('next')
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      setReturnTo(nextParam)
    } else {
      const last = localStorage.getItem('mc_lastRoute')
      if (last && last !== '/') setReturnTo(last)
    }
  }, [searchParams])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    formData.set('next', returnTo)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-muted tracking-wide pl-1">
          Email
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="input-field px-5 py-3.5 text-sm placeholder:text-muted/70"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-muted tracking-wide pl-1">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="input-field px-5 py-3.5 text-sm placeholder:text-muted/70"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full px-8 py-3.5 text-sm tracking-wide disabled:opacity-40 disabled:pointer-events-none"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      {/* Forgot password */}
      <p className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-muted/80 hover:text-foreground/70 transition-colors duration-200"
        >
          Forgot password?
        </Link>
      </p>
    </form>
  )
}
