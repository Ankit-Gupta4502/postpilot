import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Pencil, Check, X } from 'lucide-react'
import { Badge, Input } from '@postpilot/ui'
import { apiFetch } from '../../lib/api'
import { useOrg } from '../../lib/org-context'
import { queryKeys } from '../../lib/queries'

interface Workspace {
  id: string
  name: string
  role: string
  createdAt?: string | null
}

interface WorkspaceCardProps {
  workspace: Workspace
  isActive?: boolean
  onSelect?: (id: string) => void
}

export function WorkspaceCard({ workspace, isActive, onSelect }: WorkspaceCardProps) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(workspace.name)

  const canEdit = workspace.role === 'admin' || workspace.role === 'owner'

  const rename = useMutation({
    mutationFn: (name: string) =>
      apiFetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        orgId: activeOrg?.id,
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces() })
      setEditing(false)
    },
  })

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(workspace.name)
    setEditing(true)
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(false)
    setDraft(workspace.name)
  }

  function submitRename(e: React.MouseEvent) {
    e.stopPropagation()
    const name = draft.trim()
    if (!name || name === workspace.name) { setEditing(false); return }
    rename.mutate(name)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submitRename(e as unknown as React.MouseEvent)
    if (e.key === 'Escape') { setEditing(false); setDraft(workspace.name) }
  }

  return (
    <button
      type="button"
      onClick={() => !editing && onSelect?.(workspace.id)}
      className={[
        'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors',
        isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-muted/50',
      ].join(' ')}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Briefcase size={18} className="text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1" onClick={(e) => editing && e.stopPropagation()}>
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-7 py-0 text-sm"
          />
        ) : (
          <p className="truncate font-medium">{workspace.name}</p>
        )}
        <p className="text-sm text-muted-foreground capitalize">{workspace.role}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <button
              type="button"
              onClick={submitRename}
              disabled={rename.isPending}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
              title="Save"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            {isActive && <Badge variant="secondary" className="shrink-0">Active</Badge>}
            {canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                title="Rename workspace"
              >
                <Pencil size={13} />
              </button>
            )}
          </>
        )}
      </div>
    </button>
  )
}
