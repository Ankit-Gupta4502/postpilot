import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Share2, Layers } from 'lucide-react'
import { useOrg } from '../lib/org-context'
import { queries } from '../lib/queries'
import { Shell } from '../components/layout/Shell'
import { AccountCard } from '../features/accounts/AccountCard'
import { ConnectPlatformButton } from '../features/accounts/ConnectPlatformButton'

export const Route = createFileRoute('/accounts')({
  component: AccountsPage,
})

const ALL_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'youtube']
const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:8080'

function AccountsPage() {
  const { activeOrg, activeWorkspace } = useOrg()

  const { data: accounts = [], isLoading } = useQuery(
    queries.socialAccounts(activeWorkspace?.id ?? '', activeOrg?.id ?? '')
  )

  const activeAccounts = accounts.filter((a) => a.status !== 'revoked')
  const connectedPlatforms = new Set(
    accounts.filter((a) => a.status === 'connected').map((a) => a.platform)
  )
  const unconnectedPlatforms = ALL_PLATFORMS.filter((p) => !connectedPlatforms.has(p))

  return (
    <Shell>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Social Accounts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeWorkspace
                ? `Connected accounts for ${activeWorkspace.name}`
                : 'Select a workspace to manage accounts'}
            </p>
          </div>

          {!isLoading && activeAccounts.length > 0 && (
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm">
              <Share2 size={14} className="text-muted-foreground" />
              <span className="font-semibold tabular-nums">{activeAccounts.length}</span>
              <span className="text-muted-foreground">
                {activeAccounts.length === 1 ? 'account' : 'accounts'} connected
              </span>
            </div>
          )}
        </div>

        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-19 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {/* Connected accounts */}
        {!isLoading && activeAccounts.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected accounts
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeAccounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </section>
        )}

        {/* Add more platforms */}
        {!isLoading && unconnectedPlatforms.length > 0 && activeWorkspace && (
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {activeAccounts.length > 0 ? 'Add more platforms' : 'Connect a platform'}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
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

        {/* No workspace empty state */}
        {!isLoading && !activeWorkspace && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <Layers size={36} className="mb-4 text-muted-foreground/50" />
            <p className="font-semibold">No workspace selected</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Create or select a workspace first to connect your social accounts.
            </p>
          </div>
        )}
      </div>
    </Shell>
  )
}
