import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@postpilot/ui'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">PostPilot</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Schedule, publish, and analyze across all your social platforms
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/login">Get started</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
