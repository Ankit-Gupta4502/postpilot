import { Link } from '@tanstack/react-router'
import { Button, Card, CardContent } from '@postpilot/ui'

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Card className="overflow-hidden border-primary/15 bg-primary text-primary-foreground shadow-xl shadow-primary/10">
        <CardContent className="flex flex-col gap-6 py-10 sm:py-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary-foreground/80">Ready to start publishing</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Create your workspace and start scheduling today.
            </h2>
            <p className="mt-4 text-sm leading-6 text-primary-foreground/80 sm:text-base">
              Use the same product language from the first screen to the dashboard, with no
              dark-theme detour on the homepage.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link to="/register">Get started free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
