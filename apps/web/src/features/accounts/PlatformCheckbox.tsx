import { PlatformIcon } from './PlatformIcon'

interface Account {
  id: string
  platform: string
  displayName: string | null
  username: string | null
  status: string
  healthStatus?: string
}

interface PlatformCheckboxProps {
  account: Account
  checked: boolean
  onChange: (id: string, checked: boolean) => void
}

const HEALTH_DOT: Record<string, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-400',
  broken: 'bg-destructive',
}

export function PlatformCheckbox({ account, checked, onChange }: PlatformCheckboxProps) {
  const displayName = account.displayName ?? account.username ?? account.platform
  const showUsername = account.username && account.username !== account.displayName
  const dotColor = HEALTH_DOT[account.healthStatus ?? 'healthy'] ?? 'bg-muted-foreground'

  return (
    <label
      className={[
        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
        checked
          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:bg-muted/50',
      ].join(' ')}
    >
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded border-input accent-primary"
        checked={checked}
        onChange={(e) => onChange(account.id, e.target.checked)}
      />

      <div className="relative shrink-0">
        <PlatformIcon platform={account.platform} size="sm" />
        <span
          className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${dotColor}`}
          title={account.healthStatus ?? 'healthy'}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
        {showUsername && (
          <p className="truncate text-xs text-muted-foreground leading-tight">@{account.username}</p>
        )}
      </div>

      <span className="shrink-0 text-xs text-muted-foreground capitalize">{account.platform}</span>
    </label>
  )
}
