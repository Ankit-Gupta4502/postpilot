import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Shell } from '../components/layout/Shell.js'
import { WorkspaceCard } from '../features/workspaces/WorkspaceCard.js'
import { CreateWorkspaceForm } from '../features/workspaces/CreateWorkspaceForm.js'
import { useOrg } from '../lib/org-context.js'
import { apiFetch } from '../lib/api.js'

export const Route = createFileRoute('/workspaces')({
  component: WorkspacesPage,
})

interface Workspace {
  id: string
  name: string
  role: string
  createdAt: string | null
}

function WorkspacesPage() {
  const { activeOrg, activeWorkspace, setActiveWorkspaceId } = useOrg()

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ['workspaces', activeOrg?.id],
    queryFn: () => apiFetch('/api/workspaces', { orgId: activeOrg!.id }),
    enabled: !!activeOrg?.id,
  })

  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspaces group social accounts and posts within your organization.
          </p>
        </div>

        {activeOrg && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Create new workspace</h2>
            <CreateWorkspaceForm orgId={activeOrg.id} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading workspaces…</p>
          )}
          {!isLoading && workspaces.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No workspaces yet. Create your first one above.</p>
            </div>
          )}
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              isActive={activeWorkspace?.id === ws.id}
              onSelect={setActiveWorkspaceId}
            />
          ))}
        </div>
      </div>
    </Shell>
  )
}
