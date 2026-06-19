import { Link } from '@tanstack/react-router'
import { CalendarRange, ShieldCheck, BarChart3 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@postpilot/ui'
import { PLATFORM_ICONS, metrics, platformStats, floatingIcons } from './constants'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-secondary/40 via-background to-background">
      <FloatingIcons />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <HeroContent />
        <HeroCard />
      </div>
    </section>
  )
}

function FloatingIcons() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {floatingIcons.map(({ icon: Icon, className, delay, size, color }) => (
        <div
          key={className}
          className={`icon-float absolute items-center justify-center ${className} ${size} ${color}`}
          style={{ animationDelay: delay }}
        >
          <Icon className="h-full w-full" strokeWidth={1.6} />
        </div>
      ))}
    </div>
  )
}

function HeroContent() {
  return (
    <div className="max-w-2xl">
      <Badge variant="secondary" className="mb-4">
        Built for creators, teams, and agencies
      </Badge>
      <h1 className="max-w-[12ch] text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
        Schedule once. Publish everywhere.
      </h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
        PostPilot keeps your content calendar, approvals, publishing, and account management in one
        product. No extra theme, no marketing gimmicks, just the workflow your team needs.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/register">Create workspace</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/login">See the product</Link>
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
        {metrics.map((item) => (
          <div key={item.label}>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
            <p>{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {PLATFORM_ICONS.map(({ icon: Icon, color, bg, label }) => (
          <div
            key={label}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm shadow-black/5 ${bg}`}
          >
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroCard() {
  const InstagramIcon = PLATFORM_ICONS[0]!.icon
  return (
    <div className="relative mx-auto w-full max-w-[32rem] lg:min-h-[31rem]">
      <div className="absolute left-[6%] top-[6%] hidden rounded-2xl border bg-background/95 p-4 shadow-lg shadow-black/5 sm:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
            <InstagramIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Instagram Reel</p>
            <p className="text-xs text-muted-foreground">Queued for 9:00 AM</p>
          </div>
        </div>
      </div>

      <Card className="relative mx-auto mt-16 max-w-md border-border/80 shadow-xl shadow-black/5 lg:mt-10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">This week&apos;s publishing plan</CardTitle>
              <CardDescription>Compact, calm, and closer to the actual product.</CardDescription>
            </div>
            <Badge variant="secondary">5 channels</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Summer campaign rollout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  3 posts prepared across launch day.
                </p>
              </div>
              <Badge variant="success">On track</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {PLATFORM_ICONS.map(({ icon: Icon, color, bg, label }) => (
                <div
                  key={label}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${bg}`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <CalendarRange className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Content calendar</p>
                  <p className="text-xs text-muted-foreground">18 posts scheduled this week</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Updated</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Approvals</p>
                  <p className="text-xs text-muted-foreground">6 items waiting for review</p>
                </div>
              </div>
              <span className="text-xs text-amber-600">Pending</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Performance</p>
                  <p className="text-xs text-muted-foreground">Best window: Tue and Thu mornings</p>
                </div>
              </div>
              <span className="text-xs text-emerald-600">Improving</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="absolute bottom-[8%] right-[2%] hidden rounded-2xl border bg-background/95 p-4 shadow-lg shadow-black/5 md:block">
        <p className="text-xs font-medium text-muted-foreground">Connected</p>
        <div className="mt-3 flex items-center gap-2">
          {platformStats.map(({ icon: Icon, color, label }) => (
            <div
              key={label}
              className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/30"
            >
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
