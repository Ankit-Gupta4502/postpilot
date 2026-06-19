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
      <div className="mx-auto max-w-3xl">
        {!activeWorkspace && (
          <p className="rounded-2xl border border-dashed border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            Create or select a workspace first.
          </p>
        )}
        {activeWorkspace && isLoading && (
          <p className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            Loading accounts…
          </p>
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
