import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Badge, Input, Button } from '@postpilot/ui'
import { apiFetch } from '../../lib/api.js'
import { useSession } from '../../lib/auth-client.js'

interface OrgMember {
  id: string
  userId: string
  role: string
  joinedAt: string | null
  user: { id: string; name: string; email: string; image: string | null }
}

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
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'billing' | 'member'>('member')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ['org-members', orgId],
    queryFn: () => apiFetch('/api/orgs/members', { orgId }),
    enabled: !!orgId,
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/orgs/members/${userId}`, { method: 'DELETE', orgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-members', orgId] }),
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/invites', {
        method: 'POST',
        orgId,
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      }),
    onSuccess: () => {
      setInviteEmail('')
      setInviteError(null)
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 3000)
      queryClient.invalidateQueries({ queryKey: ['org-invites', orgId] })
    },
    onError: (err: Error) => setInviteError(err.message),
  })

  const canManage = ['owner', 'admin'].includes(orgRole)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Invite a member</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="billing">Billing</option>
            </select>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
            >
              {inviteMutation.isPending ? 'Sending…' : 'Invite'}
            </Button>
          </div>
          {inviteError && <p className="mt-2 text-sm text-destructive">{inviteError}</p>}
          {inviteSuccess && (
            <p className="mt-2 text-sm text-green-600">Invite sent successfully!</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {member.user.name ? member.user.name[0]?.toUpperCase() : member.user.email[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.user.name || '(no name)'}</p>
              <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] ?? ''}`}>
              {member.role}
            </span>
            {canManage && member.role !== 'owner' && member.userId !== session?.user.id && (
              <button
                type="button"
                onClick={() => removeMutation.mutate(member.userId)}
                disabled={removeMutation.isPending}
                title="Remove member"
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
