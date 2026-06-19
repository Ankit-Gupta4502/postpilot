import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiFetch } from '../../lib/api.js'
import { queries, queryKeys } from '../../lib/queries.js'

interface InvitesTabProps {
  orgId: string
  orgRole: string
}

export function InvitesTab({ orgId, orgRole }: InvitesTabProps) {
  const queryClient = useQueryClient()

  const { data: invites = [], isLoading } = useQuery(queries.orgInvites(orgId))

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch(`/api/invites/${inviteId}`, { method: 'DELETE', orgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orgInvites(orgId) }),
  })

  const canManage = ['owner', 'admin'].includes(orgRole)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading invites…</p>
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No pending invites</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{invite.email}</p>
            <p className="text-xs text-muted-foreground">
              Invited as <span className="font-medium capitalize">{invite.role}</span>
              {' · '}
              Expires {new Date(invite.expiresAt).toLocaleDateString()}
            </p>
          </div>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            Pending
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => revokeMutation.mutate(invite.id)}
              disabled={revokeMutation.isPending}
              title="Revoke invite"
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
