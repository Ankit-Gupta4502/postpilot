import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useOrg } from '../lib/org-context'
import { queries } from '../lib/queries'
import { Shell } from '../components/layout/Shell'
import { ComposerForm } from '../features/compose/ComposerForm'

export const Route = createFileRoute('/compose')({
  component: ComposePage,
})

function ComposePage() {
  const { activeOrg, activeWorkspace } = useOrg()

  const { data: accounts = [], isLoading } = useQuery(
    queries.socialAccounts(activeWorkspace?.id ?? '', activeOrg?.id ?? '')
  )

  return (
    <Shell>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">New Post</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
          </p>
        </div>

        {!activeWorkspace && (
          <p className="text-sm text-muted-foreground">Create a workspace first.</p>
        )}
        {activeWorkspace && isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {activeWorkspace && !isLoading && (
          <ComposerForm
            workspaceId={activeWorkspace.id}
            orgId={activeOrg!.id}
            accounts={accounts}
          />
        )}
      </div>
    </Shell>
  )
}
