import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@postpilot/ui'
import { useOrg } from '../lib/org-context'
import { queries, type DeadLetterJob } from '../lib/queries'
import { Shell } from '../components/layout/Shell'
import { DlqTable } from '../features/admin/DlqTable'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

type StatusFilter = 'open' | 'replayed' | 'discarded'

function DlqTabContent({ status, orgId }: { status: StatusFilter; orgId: string }) {
  const { data, isLoading } = useQuery(queries.dlq(status, orgId))

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  return <DlqTable jobs={data?.jobs ?? []} statusFilter={status} />
}

function AdminPage() {
  const { activeOrg } = useOrg()
  const isOwnerOrAdmin = activeOrg?.role === 'owner' || activeOrg?.role === 'admin'

  return (
    <Shell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <ShieldAlert size={20} className="text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin — Dead Letter Queue</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Inspect, replay, or discard failed background jobs.
            </p>
          </div>
        </div>

        {!isOwnerOrAdmin ? (
          <p className="text-sm text-muted-foreground">Owner or admin access required.</p>
        ) : (
          <Tabs defaultValue="open">
            <TabsList className="mb-4">
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="replayed">Replayed</TabsTrigger>
              <TabsTrigger value="discarded">Discarded</TabsTrigger>
            </TabsList>
            <TabsContent value="open">
              <DlqTabContent status="open" orgId={activeOrg!.id} />
            </TabsContent>
            <TabsContent value="replayed">
              <DlqTabContent status="replayed" orgId={activeOrg!.id} />
            </TabsContent>
            <TabsContent value="discarded">
              <DlqTabContent status="discarded" orgId={activeOrg!.id} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Shell>
  )
}
