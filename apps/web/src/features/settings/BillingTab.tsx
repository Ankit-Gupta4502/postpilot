import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api.js'

interface Plan {
  plan: string
  price: number
  currency: string
  features: { teams: boolean; approvals: boolean; white_label: boolean }
}

interface Org {
  id: string
  name: string
  plan: string
  planStatus: string
}

interface BillingTabProps {
  org: Org
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  past_due: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-orange-100 text-orange-800',
  expired: 'bg-red-100 text-red-800',
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}/mo`
}

export function BillingTab({ org }: BillingTabProps) {
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['billing-plans'],
    queryFn: () => apiFetch('/api/billing/plans'),
  })

  const currentPlan = plans.find((p) => p.plan === org.plan)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
            <p className="mt-1 text-2xl font-bold">{PLAN_LABELS[org.plan] ?? org.plan}</p>
            {currentPlan && currentPlan.price > 0 && (
              <p className="text-sm text-muted-foreground">{formatPrice(currentPlan.price)}</p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[org.planStatus] ?? 'bg-muted text-muted-foreground'}`}
          >
            {org.planStatus === 'active' ? 'Active' : org.planStatus}
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Available plans</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.plan}
              className={`rounded-lg border p-4 ${
                plan.plan === org.plan ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{PLAN_LABELS[plan.plan] ?? plan.plan}</p>
                {plan.plan === org.plan && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.price === 0 ? 'Free forever' : formatPrice(plan.price)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.features.teams && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Teams</span>
                )}
                {plan.features.approvals && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Approvals</span>
                )}
                {plan.features.white_label && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">White-label</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          To upgrade or manage billing, contact support or visit the Razorpay billing portal.
        </p>
      </div>
    </div>
  )
}
