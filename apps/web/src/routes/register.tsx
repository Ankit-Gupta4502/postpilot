import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@postpilot/ui'
import { GoogleSignInButton } from '../features/auth/GoogleSignInButton.js'
import { EmailSignUpForm } from '../features/auth/EmailSignUpForm.js'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">PostPilot</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule &amp; publish across all your social platforms
          </p>
        </div>
      </div>

      <Card className="w-full max-w-sm shadow-lg shadow-black/5">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Create your account</CardTitle>
          <CardDescription>Get started with PostPilot for free</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <EmailSignUpForm />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton label="Sign up with Google" />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
