import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Share2, Layers, Sparkles, Plug, CheckCircle2 } from 'lucide-react'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@postpilot/ui'
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
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-emerald-500/8 via-primary/5 to-transparent">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-medium">
                Accounts
              </Badge>
              {activeWorkspace && (
                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-medium">
                  {activeWorkspace.name}
                </Badge>
              )}
            </div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles size={18} className="text-primary" />
              Social accounts that stay in sync
            </CardTitle>
            <CardDescription className="max-w-3xl">
              Group accounts by platform, connect new ones quickly, and keep the workspace publish pool clean.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Share2 size={13} />
                Connected
              </div>
              <p className="mt-2 text-base font-semibold">{activeAccounts.length}</p>
              <p className="text-xs text-muted-foreground">Accounts available in this workspace</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <CheckCircle2 size={13} />
                Platforms
              </div>
              <p className="mt-2 text-base font-semibold">{connectedPlatforms.size}</p>
              <p className="text-xs text-muted-foreground">Platforms already connected</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Plug size={13} />
                Expand
              </div>
              <p className="mt-2 text-base font-semibold">Add more channels</p>
              <p className="text-xs text-muted-foreground">Connect the platforms you want to publish to next.</p>
            </div>
          </CardContent>
        </Card>

        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted/60" />
            ))}
          </div>
        )}

        {/* Connected accounts */}
        {!isLoading && activeAccounts.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Connected accounts
              </h2>
              <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                {activeAccounts.length} total
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeAccounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </section>
        )}

        {/* Add more platforms */}
        {!isLoading && unconnectedPlatforms.length > 0 && activeWorkspace && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/80 py-20 text-center">
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
