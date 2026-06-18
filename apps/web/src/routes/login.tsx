import { createFileRoute } from '@tanstack/react-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@postpilot/ui'
import { authClient } from '../lib/auth-client.js'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to PostPilot</CardTitle>
          <CardDescription>Sign in to manage your social media</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleGoogleLogin}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
