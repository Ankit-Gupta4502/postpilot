import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useOrg } from '../lib/org-context'
import { queries } from '../lib/queries'
import { Shell } from '../components/layout/Shell'
import { AccountSelector } from '../features/analytics/AccountSelector'
import { SummaryCards } from '../features/analytics/SummaryCards'
import { EngagementChart } from '../features/analytics/EngagementChart'
import { TopPostsTable } from '../features/analytics/TopPostsTable'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { activeOrg, activeWorkspace } = useOrg()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const orgId = activeOrg?.id ?? ''

  const { data: accounts = [], isLoading: accountsLoading } = useQuery(
    queries.socialAccounts(activeWorkspace?.id ?? '', orgId)
  )

  useEffect(() => {
    const connected = accounts.filter((a) => a.status === 'connected')
    if (connected.length > 0 && !selectedAccountId) {
      setSelectedAccountId(connected[0]!.id)
    }
  }, [accounts, selectedAccountId])

  const selId = selectedAccountId ?? ''
  const { data: summary }                          = useQuery(queries.analyticsSummary(selId, orgId))
  const { data: postsData }                        = useQuery(queries.analyticsPosts(selId, orgId))
  const { data: snapshotsData, isLoading: snapshotsLoading } = useQuery(queries.analyticsSnapshots(selId, orgId))

  const posts     = postsData?.posts     ?? []
  const snapshots = snapshotsData?.snapshots ?? []

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
        </p>
      </div>

      <div className="space-y-6">
        {accountsLoading ? (
          <p className="text-sm text-muted-foreground">Loading accounts…</p>
        ) : (
          <AccountSelector
            accounts={accounts}
            selectedId={selectedAccountId}
            onChange={setSelectedAccountId}
          />
        )}

        {selectedAccountId && (
          <>
            <SummaryCards totalPosts={summary?.totalPosts ?? 0} posts={posts} />
            <EngagementChart snapshots={snapshots} isLoading={snapshotsLoading} />
            <TopPostsTable posts={posts} />
          </>
        )}
      </div>
    </Shell>
  )
}
