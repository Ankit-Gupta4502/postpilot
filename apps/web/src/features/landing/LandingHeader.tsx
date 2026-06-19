import { Link } from '@tanstack/react-router'
import { Button } from '@postpilot/ui'

export function LandingHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h18M12 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold tracking-tight">PostPilot</p>
            <p className="text-xs text-muted-foreground">Social publishing for one workflow</p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
