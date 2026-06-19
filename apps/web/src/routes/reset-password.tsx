import { createFileRoute, Link } from '@tanstack/react-router'
import { ResetPasswordForm } from '../features/auth/ResetPasswordForm'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (s: Record<string, unknown>) => ({ token: String(s['token'] ?? '') }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-destructive">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="mt-2 block text-sm text-primary underline underline-offset-2">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}
