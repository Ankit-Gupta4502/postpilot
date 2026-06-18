import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@postpilot/ui'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/25">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">PostPilot</h1>
          <p className="mt-3 max-w-md text-lg text-muted-foreground">
            Schedule, publish, and analyze content across all your social platforms — from one place.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link to="/login">Get started free</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/dashboard">View dashboard</Link>
        </Button>
      </div>

      <div className="flex gap-8 text-center text-sm text-muted-foreground">
        {[
          ['5 platforms', 'Instagram, X, LinkedIn & more'],
          ['Auto-scheduling', 'Post at the perfect time'],
          ['Analytics', 'Track what resonates'],
        ].map(([title, desc]) => (
          <div key={title} className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground">{title}</span>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
