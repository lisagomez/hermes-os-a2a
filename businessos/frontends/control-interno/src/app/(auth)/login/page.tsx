import { Suspense } from 'react'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import { LoginForm } from '@/features/auth/components'

export default function LoginPage() {
  return (
    <div className="w-full max-w-xs sm:max-w-sm">
      <div className="titanium-bezel w-full">
        <div className="titanium-screen p-6 sm:p-8">

          <div className="text-center mb-8">
            <span className="mx-auto mb-4 flex w-12 h-12 items-center justify-center rounded-2xl bg-card border border-border-subtle shadow-depth-rest-soft">
              <Bot className="size-6 text-primary" aria-hidden="true" />
            </span>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted mb-2">business-os-new</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted">Sign in to your account</p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <p className="text-center text-sm text-muted/80 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-foreground/70 hover:text-foreground transition-colors duration-200">
          Sign up
        </Link>
      </p>
    </div>
  )
}
