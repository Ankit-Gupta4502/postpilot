import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { useOrg } from '../lib/org-context'
import { Shell } from '../components/layout/Shell'
import { AccountCard } from '../features/accounts/AccountCard'
import { ConnectPlatformButton } from '../features/accounts/ConnectPlatformButton'

export const Route = createFileRoute('/accounts')({
  component: AccountsPage,
})

const ALL_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'youtube']

const API_BASE =
  typeof window !== 'undefined'
    ? window.location.origin === 'http://localhost:3000'
      ? 'http://localhost:8080'
      : ''
    : 'http://localhost:8080'

interface SocialAccount {
  id: string
  platform: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  status: string
  healthStatus: string
  lastErrorMessage: string | null
}

function AccountsPage() {
  const { activeOrg, activeWorkspace } = useOrg()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['social-accounts', activeWorkspace?.id],
    queryFn: () =>
      apiFetch<SocialAccount[]>(`/api/social-accounts/${activeWorkspace!.id}`, {
        orgId: activeOrg!.id,
      }),
    enabled: !!activeOrg && !!activeWorkspace,
  })

  const connectedPlatforms = new Set(
    accounts.filter((a) => a.status === 'connected').map((a) => a.platform)
  )
  const unconnectedPlatforms = ALL_PLATFORMS.filter((p) => !connectedPlatforms.has(p))

  return (
    <Shell>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Social Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && accounts.filter((a) => a.status !== 'revoked').length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected
            </h2>
            <div className="space-y-3">
              {accounts
                .filter((a) => a.status !== 'revoked')
                .map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
            </div>
          </section>
        )}

        {!isLoading && unconnectedPlatforms.length > 0 && activeWorkspace && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connect a platform
            </h2>
            <div className="flex flex-wrap gap-3">
              {unconnectedPlatforms.map((platform) => (
                <ConnectPlatformButton
                  key={platform}
                  platform={platform}
                  workspaceId={activeWorkspace.id}
                  apiBaseUrl={API_BASE}
                />
              ))}
            </div>
          </section>
        )}

        {!isLoading && !activeWorkspace && (
          <p className="text-sm text-muted-foreground">
            Create a workspace first to connect social accounts.
          </p>
        )}
      </div>
    </Shell>
  )
}
