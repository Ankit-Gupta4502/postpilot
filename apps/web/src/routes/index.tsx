import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Facebook,
  Instagram,
  Linkedin,
  ShieldCheck,
  Twitter,
  Youtube,
  BarChart3,
  CalendarRange,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@postpilot/ui'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const platformStats = [
  { label: 'Instagram', value: '12 scheduled', icon: Instagram },
  { label: 'LinkedIn', value: '8 queued', icon: Linkedin },
  { label: 'YouTube', value: '3 drafts', icon: Youtube },
  { label: 'X', value: '15 ready', icon: Twitter },
]

const features = [
  {
    title: 'One calendar for every channel',
    description: 'Plan Instagram, LinkedIn, X, YouTube, and Facebook content from a single queue without juggling tabs.',
    icon: CalendarRange,
  },
  {
    title: 'Clear approvals for teams and clients',
    description: 'Draft, review, approve, and publish with a workflow that matches how agencies and internal teams already work.',
    icon: ShieldCheck,
  },
  {
    title: 'Analytics you can act on',
    description: 'See what shipped, what performed, and where the next publishing opportunity is instead of staring at vanity metrics.',
    icon: BarChart3,
  },
]

const productPoints = [
  'Unified post composer with platform selection',
  'Scheduled publishing and draft management',
  'Workspace access for teams and agencies',
  'Approval flow before anything goes live',
]

const metrics = [
  { value: '50K+', label: 'active creators' },
  { value: '2M+', label: 'scheduled posts' },
  { value: '97%', label: 'on-time delivery' },
]

const floatingIcons = [
  {
    icon: Instagram,
    className: 'left-[4%] top-14 hidden sm:flex',
    delay: '0s',
    size: 'h-12 w-12',
    tint: 'text-pink-300/55',
  },
  {
    icon: Linkedin,
    className: 'right-[10%] top-24 hidden lg:flex',
    delay: '1.1s',
    size: 'h-10 w-10',
    tint: 'text-sky-300/55',
  },
  {
    icon: Youtube,
    className: 'left-[38%] top-6 hidden md:flex',
    delay: '0.5s',
    size: 'h-9 w-9',
    tint: 'text-rose-300/50',
  },
  {
    icon: Twitter,
    className: 'right-[5%] bottom-18 hidden sm:flex',
    delay: '1.7s',
    size: 'h-14 w-14',
    tint: 'text-slate-300/50',
  },
  {
    icon: Facebook,
    className: 'left-[12%] bottom-10 hidden lg:flex',
    delay: '0.8s',
    size: 'h-10 w-10',
    tint: 'text-indigo-300/50',
  },
]

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

      <main>
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-secondary/40 via-background to-background">
          <div className="pointer-events-none absolute inset-0">
            {floatingIcons.map(({ icon: Icon, className, delay, size, tint }) => (
              <div
                key={className}
                className={`icon-float absolute items-center justify-center ${className} ${size} ${tint}`}
                style={{ animationDelay: delay }}
              >
                <Icon className="h-full w-full" strokeWidth={1.6} />
              </div>
            ))}
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4">Built for creators, teams, and agencies</Badge>
              <h1 className="max-w-[12ch] text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Schedule once. Publish everywhere.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                PostPilot keeps your content calendar, approvals, publishing, and account management in one product. No extra theme, no marketing gimmicks, just the workflow your team needs.
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
              <div className="mt-8 flex flex-wrap items-center gap-3 text-muted-foreground">
                {[Instagram, Linkedin, Youtube, Twitter, Facebook].map((Icon, index) => (
                  <div key={index} className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background/80 shadow-sm shadow-black/5">
                    <Icon className="h-4 w-4" />
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[32rem] lg:min-h-[31rem]">
              <div className="absolute left-[6%] top-[6%] hidden rounded-2xl border bg-background/95 p-4 shadow-lg shadow-black/5 sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                    <Instagram className="h-5 w-5" />
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
                        <p className="mt-1 text-sm text-muted-foreground">3 posts prepared across launch day.</p>
                      </div>
                      <Badge variant="success">On track</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[Instagram, Linkedin, Youtube, Twitter, Facebook].map((Icon, index) => (
                        <div key={index} className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background text-muted-foreground">
                          <Icon className="h-4 w-4" />
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
                  {platformStats.slice(0, 4).map((item) => (
                    <div key={item.label} className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/30 text-muted-foreground">
                      <item.icon className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Why teams pick PostPilot</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              One product theme, one workflow, less friction
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The landing page should describe the same product experience users get after sign in. This layout stays close to the app: clean surfaces, clear hierarchy, and practical product messaging.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full shadow-sm shadow-black/5">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="leading-6">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-medium text-primary">What&apos;s included</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Built around the product, not around a campaign page
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Everything here maps back to actual functionality already present in the app, so the landing page feels consistent with the rest of the experience.
              </p>
            </div>

            <Card className="shadow-sm shadow-black/5">
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                {productPoints.map((point) => (
                  <div key={point} className="rounded-lg border bg-background p-4 text-sm font-medium">
                    {point}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Card className="overflow-hidden border-primary/15 bg-primary text-primary-foreground shadow-xl shadow-primary/10">
            <CardContent className="flex flex-col gap-6 py-10 sm:py-12 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-primary-foreground/80">Ready to start publishing</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Create your workspace and start scheduling today.
                </h2>
                <p className="mt-4 text-sm leading-6 text-primary-foreground/80 sm:text-base">
                  Use the same product language from the first screen to the dashboard, with no dark-theme detour on the homepage.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary" size="lg">
                  <Link to="/register">Get started free</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
