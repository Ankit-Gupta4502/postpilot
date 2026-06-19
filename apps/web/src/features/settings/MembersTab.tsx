import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Badge } from '@postpilot/ui'
import { apiFetch } from '../../lib/api.js'
import { useSession } from '../../lib/auth-client.js'
import { queries, queryKeys } from '../../lib/queries.js'
import { InviteMemberForm } from './InviteMemberForm.js'

interface MembersTabProps {
  orgId: string
  orgRole: string
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-yellow-100 text-yellow-800',
  admin: 'bg-blue-100 text-blue-800',
  billing: 'bg-green-100 text-green-800',
  member: 'bg-muted text-muted-foreground',
}

export function MembersTab({ orgId, orgRole }: MembersTabProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const { data: members = [], isLoading } = useQuery(queries.orgMembers(orgId))

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/orgs/members/${userId}`, { method: 'DELETE', orgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers(orgId) }),
  })

  const canManage = ['owner', 'admin'].includes(orgRole)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && <InviteMemberForm orgId={orgId} />}

      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {member.user.name ? member.user.name[0]?.toUpperCase() : member.user.email[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.user.name || '(no name)'}</p>
              <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] ?? ''}`}>
              {member.role}
            </span>
            {canManage && member.role !== 'owner' && member.userId !== session?.user.id && (
              <button
                type="button"
                onClick={() => removeMutation.mutate(member.userId)}
                disabled={removeMutation.isPending}
                title="Remove member"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
