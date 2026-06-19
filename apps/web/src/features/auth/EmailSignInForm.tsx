import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { Input } from '@postpilot/ui'
import { authClient } from '../../lib/auth-client.js'

export function EmailSignInForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await authClient.signIn.email({ email, password })
      if (authError) {
        setError(authError.message ?? 'Invalid email or password')
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signin-email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="signin-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="signin-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="signin-password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
