import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, CardContent } from '@postpilot/ui'
import { apiFetch } from '../../lib/api'
import { useOrg } from '../../lib/org-context'
import { PlatformIcon } from './PlatformIcon'
import { HealthBadge } from './HealthBadge'

interface Account {
  id: string
  platform: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  status: string
  healthStatus: string
  lastErrorMessage: string | null
}

export function AccountCard({ account }: { account: Account }) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()

  const disconnect = useMutation({
    mutationFn: () =>
      apiFetch(`/api/social-accounts/${account.id}`, {
        method: 'DELETE',
        orgId: activeOrg?.id,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
  })

  const displayName = account.displayName ?? account.username ?? account.platform

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <PlatformIcon platform={account.platform} />

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          {account.username && account.username !== displayName && (
            <p className="text-xs text-muted-foreground">@{account.username}</p>
          )}
          {account.status === 'broken' && account.lastErrorMessage && (
            <p className="mt-0.5 truncate text-xs text-destructive">{account.lastErrorMessage}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <HealthBadge status={account.healthStatus} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="text-xs"
          >
            {disconnect.isPending ? 'Removing…' : 'Disconnect'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
