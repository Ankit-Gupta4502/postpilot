import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, CardContent } from '@postpilot/ui'
import { Trash2, AlertCircle } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useOrg } from '../../lib/org-context'
import { queryKeys } from '../../lib/queries'
import { PlatformIcon } from './PlatformIcon'
import { HealthBadge } from './HealthBadge'

const PLATFORM_ACCENT: Record<string, string> = {
  instagram: '#EC4899',
  facebook: '#2563EB',
  linkedin: '#0369A1',
  x: '#171717',
  youtube: '#DC2626',
}

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
      apiFetch(`/api/social-accounts/${account.id}`, { method: 'DELETE', orgId: activeOrg?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.socialAccounts() }),
  })

  const displayName = account.displayName ?? account.username ?? account.platform
  const accentColor = PLATFORM_ACCENT[account.platform] ?? '#6b7280'

  return (
    <Card
      className="overflow-hidden py-0 gap-0 transition-shadow hover:shadow-md"
      style={{ borderLeftColor: accentColor, borderLeftWidth: '4px' }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={account.platform} size="md" />

          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold text-sm leading-tight">{displayName}</p>
            {account.username && (
              <p className="mt-0.5 text-xs text-muted-foreground">@{account.username}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <HealthBadge status={account.healthStatus} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {account.healthStatus === 'broken' && account.lastErrorMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
            <AlertCircle size={13} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-xs text-red-700 dark:text-red-400 leading-snug">{account.lastErrorMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
