import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, LayoutDashboard } from 'lucide-react'
import { useOrg } from '../lib/org-context'
import { mutations, queryKeys } from '../lib/queries'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { activeOrg, orgs } = useOrg()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(orgs.length > 0 ? 2 : 1)
  const [orgName, setOrgName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('My Workspace')
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(activeOrg?.id ?? null)

  const createOrg = useMutation({
    ...mutations.createOrg(),
    onSuccess: async (org) => {
      await queryClient.refetchQueries({ queryKey: ['orgs'] })
      setCreatedOrgId(org.id)
      setStep(2)
    },
  })

  const createWorkspace = useMutation({
    ...mutations.createWorkspace(createdOrgId ?? ''),
    onSuccess: async () => {
      // Refetch workspaces first so isOnboarded becomes true before RouteGuard fires
      await queryClient.refetchQueries({ queryKey: queryKeys.workspaces(createdOrgId!) })
      navigate({ to: '/dashboard', replace: true })
    },
  })

  const isBusy = createOrg.isPending || createWorkspace.isPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Welcome to PostPilot</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Let's set up your account in two quick steps.
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center gap-3">
          {[
            { n: 1, label: 'Organization', icon: Building2 },
            { n: 2, label: 'Workspace', icon: LayoutDashboard },
          ].map(({ n, label }, i) => {
            const done = step > n || (n === 1 && orgs.length > 0)
            return (
              <div key={n} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    step === n
                      ? 'bg-primary text-primary-foreground'
                      : done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {done ? '✓' : n}
                </div>
                <span className="text-sm font-medium">{label}</span>
                {i === 0 && <div className="ml-2 h-px flex-1 bg-border" />}
              </div>
            )
          })}
        </div>

        {/* Step 1 — Create org */}
        {step === 1 && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              <h2 className="font-semibold">Create your organization</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Your company or team. You can invite members later.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (orgName.trim()) createOrg.mutate(orgName.trim())
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="e.g. Acme Inc."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                autoFocus
              />
              {createOrg.isError && (
                <p className="text-xs text-destructive">{(createOrg.error as Error).message}</p>
              )}
              <button
                type="submit"
                disabled={isBusy || !orgName.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createOrg.isPending && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {createOrg.isPending ? 'Creating…' : 'Continue →'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2 — Create workspace */}
        {step === 2 && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <LayoutDashboard size={18} className="text-primary" />
              <h2 className="font-semibold">Create your first workspace</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Workspaces group your social accounts and posts. You can create more later.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (workspaceName.trim()) createWorkspace.mutate(workspaceName.trim())
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="e.g. My Workspace"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                autoFocus
              />
              {createWorkspace.isError && (
                <p className="text-xs text-destructive">{(createWorkspace.error as Error).message}</p>
              )}
              <button
                type="submit"
                disabled={isBusy || !workspaceName.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createWorkspace.isPending && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {createWorkspace.isPending ? 'Setting up…' : 'Get started →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
