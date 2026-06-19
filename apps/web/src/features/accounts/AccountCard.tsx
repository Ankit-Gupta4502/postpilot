import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@postpilot/ui'
import { AlertCircle, Trash2 } from 'lucide-react'
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
      className="group overflow-hidden border-border/70 bg-card/90 py-0 gap-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderTopColor: accentColor, borderTopWidth: '3px' }}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 pb-3">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={account.platform} size="md" />

          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{displayName}</CardTitle>
            <CardDescription className="truncate text-xs">
              {account.username ? `@${account.username}` : account.platform}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HealthBadge status={account.healthStatus} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{account.platform}</span> account is connected to the current workspace.
        </div>

        {account.healthStatus === 'broken' && account.lastErrorMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200/70 bg-red-50/70 px-3 py-2.5 dark:border-red-900/60 dark:bg-red-950/25">
            <AlertCircle size={13} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-xs leading-snug text-red-700 dark:text-red-400">{account.lastErrorMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
