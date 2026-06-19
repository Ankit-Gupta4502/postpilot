import { Link } from '@tanstack/react-router'
import { Check, Minus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PLAN_LIMITS, type OrgPlan } from '@postpilot/shared/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
  cn,
} from '@postpilot/ui'
import { queries } from '../../lib/queries'

const FEATURE_LABELS = [
  'Social accounts',
  'Workspaces',
  'Members',
  'Scheduled posts',
  'Analytics retention',
  'Teams & roles',
  'Approval workflows',
]

function featureValue(plan: OrgPlan, index: number): string | boolean {
  const l = PLAN_LIMITS[plan]
  switch (index) {
    case 0: return String(l.maxAccounts)
    case 1: return l.maxWorkspaces === null ? 'Unlimited' : String(l.maxWorkspaces)
    case 2: return l.maxMembers === null ? 'Unlimited' : String(l.maxMembers)
    case 3: return l.maxScheduled === null ? 'Unlimited' : `${l.maxScheduled} concurrent`
    case 4: return `${l.analyticsRetentionDays} days`
    case 5: return l.features.teams
    case 6: return l.features.approvals
    default: return false
  }
}

function formatPrice(paise: number): string {
  return (paise / 100).toLocaleString('en-IN')
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
    )
  }
  return <span className="text-sm font-medium">{value}</span>
}

function PricingSkeleton() {
  return (
    <div className="mt-12 grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-64 rounded-xl border bg-muted/30" />
      ))}
    </div>
  )
}

const PLAN_ORDER: OrgPlan[] = ['free', 'starter', 'pro', 'agency']
const POPULAR_PLAN: OrgPlan = 'pro'

export function PricingSection() {
  const { data: plans = [], isLoading } = useQuery(queries.billingPlans())

  // Sort API response to match our canonical order
  const sorted = PLAN_ORDER.map((id) => plans.find((p) => p.plan === id)).filter(Boolean) as typeof plans

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-medium text-primary">Simple, transparent pricing</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Pick the plan that fits your team
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          All paid plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>

      {isLoading ? (
        <PricingSkeleton />
      ) : (
        <>
          {/* Mobile / tablet cards */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:hidden">
            {sorted.map((plan) => {
              const planId = plan.plan as OrgPlan
              const isPopular = planId === POPULAR_PLAN
              return (
                <Card
                  key={planId}
                  className={cn(
                    'relative shadow-sm shadow-black/5',
                    isPopular && 'border-primary/40 shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-0 right-0 flex justify-center">
                      <Badge className="shadow-sm shadow-primary/20">Most popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base capitalize">{plan.plan}</CardTitle>
                    <div className="mt-3 flex items-baseline gap-1">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-semibold tracking-tight">Free</span>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-muted-foreground">₹</span>
                          <span className="text-3xl font-semibold tracking-tight">
                            {formatPrice(plan.price)}
                          </span>
                          <span className="text-sm text-muted-foreground">/ mo</span>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ul className="space-y-2.5">
                      {FEATURE_LABELS.map((label, i) => {
                        const val = featureValue(planId, i)
                        return (
                          <li key={label} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <FeatureCell value={val} />
                          </li>
                        )
                      })}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      variant={isPopular ? 'default' : 'outline'}
                      className="w-full"
                      size="lg"
                    >
                      <Link to="/register">
                        {plan.price === 0 ? 'Get started' : `Start ${plan.plan}`}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          {/* Desktop comparison table */}
          <div className="mt-12 hidden lg:block">
            <div className="overflow-hidden rounded-xl border shadow-sm shadow-black/5">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-[26%] border-b bg-muted/40 px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Features
                    </th>
                    {sorted.map((plan) => {
                      const planId = plan.plan as OrgPlan
                      const isPopular = planId === POPULAR_PLAN
                      return (
                        <th
                          key={planId}
                          className={cn(
                            'relative border-b px-6 py-4 text-left',
                            isPopular
                              ? 'bg-primary/5 after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-primary'
                              : 'bg-muted/20'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize">{plan.plan}</span>
                            {isPopular && <Badge className="text-[10px]">Popular</Badge>}
                          </div>
                          <div className="mt-1.5 flex items-baseline gap-0.5">
                            {plan.price === 0 ? (
                              <span className="text-2xl font-semibold tracking-tight">Free</span>
                            ) : (
                              <>
                                <span className="text-xs text-muted-foreground">₹</span>
                                <span className="text-2xl font-semibold tracking-tight">
                                  {formatPrice(plan.price)}
                                </span>
                                <span className="text-xs text-muted-foreground">/mo</span>
                              </>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_LABELS.map((label, i) => (
                    <tr key={label} className="group border-b last:border-b-0">
                      <td className="bg-muted/10 px-6 py-3.5 font-medium text-muted-foreground group-hover:bg-muted/20">
                        {label}
                      </td>
                      {sorted.map((plan) => {
                        const planId = plan.plan as OrgPlan
                        const isPopular = planId === POPULAR_PLAN
                        return (
                          <td
                            key={planId}
                            className={cn('px-6 py-3.5 group-hover:bg-muted/10', isPopular && 'bg-primary/3')}
                          >
                            <FeatureCell value={featureValue(planId, i)} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="bg-muted/10 px-6 py-4" />
                    {sorted.map((plan) => {
                      const planId = plan.plan as OrgPlan
                      const isPopular = planId === POPULAR_PLAN
                      return (
                        <td
                          key={planId}
                          className={cn('px-6 py-4', isPopular && 'bg-primary/3')}
                        >
                          <Button
                            asChild
                            variant={isPopular ? 'default' : 'outline'}
                            className="w-full"
                          >
                            <Link to="/register">
                              {plan.price === 0 ? 'Get started' : `Start ${plan.plan}`}
                            </Link>
                          </Button>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            All prices in INR · billed monthly · annual billing saves 20%
          </p>
        </>
      )}
    </section>
  )
}
