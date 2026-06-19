import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { PLAN_LIMITS, type OrgPlan } from '@postpilot/shared/types'
import { Button } from '@postpilot/ui'
import { queries, type SubscribeResult } from '../../lib/queries'
import { apiFetch } from '../../lib/api'

interface Org {
  id: string
  name: string
  plan: string
  planStatus: string
  role: string
}

interface BillingTabProps {
  org: Org
}

const PLAN_ORDER: OrgPlan[] = ['free', 'starter', 'pro', 'agency']

const PLAN_LABELS: Record<OrgPlan, string> = {
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

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}/mo`
}

const CAN_SUBSCRIBE = ['owner', 'admin', 'billing']

export function BillingTab({ org }: BillingTabProps) {
  const queryClient = useQueryClient()
  const { data: plans = [], isLoading } = useQuery(queries.billingPlans())
  const [subscribingTo, setSubscribingTo] = useState<OrgPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canManageBilling = CAN_SUBSCRIBE.includes(org.role)
  const currentPlanIndex = PLAN_ORDER.indexOf(org.plan as OrgPlan)

  const subscribe = useMutation({
    mutationFn: (plan: OrgPlan) =>
      apiFetch<SubscribeResult>('/api/billing/subscribe', {
        method: 'POST',
        data: { plan },
        orgId: org.id,
      }),
    onMutate: (plan) => {
      setSubscribingTo(plan)
      setError(null)
    },
    onSuccess: (result) => {
      // Invalidate org query so plan status updates after Razorpay returns
      queryClient.invalidateQueries({ queryKey: ['orgs'] })
      // Redirect to Razorpay hosted checkout
      window.location.href = result.shortUrl
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : 'Failed to start checkout. Please try again.'
      setError(msg)
      setSubscribingTo(null)
    },
  })

  // Sort API plans to match PLAN_ORDER
  const sorted = PLAN_ORDER.map((id) => plans.find((p) => p.plan === id)).filter(Boolean) as typeof plans

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan status */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current plan
            </p>
            <p className="mt-1 text-2xl font-bold">
              {PLAN_LABELS[org.plan as OrgPlan] ?? org.plan}
            </p>
            {(() => {
              const current = plans.find((p) => p.plan === org.plan)
              return current && current.price > 0 ? (
                <p className="text-sm text-muted-foreground">{formatPrice(current.price)}</p>
              ) : null
            })()}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              STATUS_COLORS[org.planStatus] ?? 'bg-muted text-muted-foreground'
            }`}
          >
            {STATUS_LABELS[org.planStatus] ?? org.planStatus}
          </span>
        </div>

        {org.planStatus === 'past_due' && (
          <p className="mt-3 text-sm text-yellow-700">
            Your last payment failed. Update your payment method to keep your plan active.
          </p>
        )}
        {org.planStatus === 'expired' && (
          <p className="mt-3 text-sm text-destructive">
            Your plan has expired. Upgrade to restore access to paid features.
          </p>
        )}
      </div>

      {/* Plan limits overview */}
      <div className="rounded-lg border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Plan limits
        </p>
        {(() => {
          const limits = PLAN_LIMITS[org.plan as OrgPlan]
          if (!limits) return null
          return (
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ['Social accounts', limits.maxAccounts],
                ['Workspaces', limits.maxWorkspaces ?? 'Unlimited'],
                ['Members', limits.maxMembers ?? 'Unlimited'],
                ['Scheduled posts', limits.maxScheduled === null ? 'Unlimited' : `${limits.maxScheduled} concurrent`],
                ['Analytics', `${limits.analyticsRetentionDays}d retention`],
                ['Teams & roles', limits.features.teams ? 'Included' : '—'],
                ['Approvals', limits.features.approvals ? 'Included' : '—'],
              ].map(([label, val]) => (
                <div key={label as string} className="rounded-md bg-muted/30 px-3 py-2">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{val}</dd>
                </div>
              ))}
            </dl>
          )
        })()}
      </div>

      {/* Available plans */}
      <div>
        <h3 className="mb-3 text-sm font-medium">
          {canManageBilling ? 'Upgrade your plan' : 'Available plans'}
        </h3>

        {error && (
          <p className="mb-3 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted/30" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sorted.map((plan) => {
              const planId = plan.plan as OrgPlan
              const isCurrent = planId === org.plan
              const planIndex = PLAN_ORDER.indexOf(planId)
              const isUpgrade = planIndex > currentPlanIndex
              const isDowngrade = planIndex < currentPlanIndex && planId !== 'free'
              const isPaid = plan.price > 0
              const isSubscribing = subscribingTo === planId && subscribe.isPending

              return (
                <div
                  key={planId}
                  className={`rounded-lg border p-4 transition-colors ${
                    isCurrent
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{PLAN_LABELS[planId]}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {plan.price === 0 ? 'Free forever' : formatPrice(plan.price)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                          {PLAN_LIMITS[planId].maxAccounts} accounts
                        </span>
                        {PLAN_LIMITS[planId].features.teams && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Teams</span>
                        )}
                        {PLAN_LIMITS[planId].features.approvals && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Approvals</span>
                        )}
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Current
                      </span>
                    ) : canManageBilling && isPaid && (isUpgrade || isDowngrade) ? (
                      <Button
                        size="sm"
                        variant={isUpgrade ? 'default' : 'outline'}
                        disabled={subscribe.isPending}
                        onClick={() => subscribe.mutate(planId)}
                        className="shrink-0"
                      >
                        {isSubscribing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Starting…
                          </>
                        ) : isUpgrade ? (
                          'Upgrade'
                        ) : (
                          'Downgrade'
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!canManageBilling && (
          <p className="mt-3 text-xs text-muted-foreground">
            Only org owners, admins, and billing members can manage subscriptions.
          </p>
        )}
      </div>
    </div>
  )
}
