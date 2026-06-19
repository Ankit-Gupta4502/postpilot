import { PlatformIcon } from './PlatformIcon'
import { Check } from 'lucide-react'
import { HealthBadge } from './HealthBadge'

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

export function PlatformCheckbox({ account, checked, onChange }: PlatformCheckboxProps) {
  const displayName = account.displayName ?? account.username ?? account.platform
  const showUsername = account.username && account.username !== account.displayName

  return (
    <label
      className={[
        'group flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 transition-all',
        checked
          ? 'border-primary/25 bg-primary/5 shadow-sm shadow-primary/5 ring-1 ring-primary/10'
          : 'border-border/70 bg-background hover:border-border hover:bg-muted/40',
      ].join(' ')}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(account.id, e.target.checked)}
      />

      <div className="relative shrink-0">
        <div
          className={[
            'flex h-10 w-10 items-center justify-center rounded-xl border transition-all',
            checked
              ? 'border-primary/20 bg-primary text-primary-foreground'
              : 'border-border/70 bg-muted text-muted-foreground group-hover:bg-card group-hover:text-foreground',
          ].join(' ')}
        >
          <PlatformIcon platform={account.platform} size="sm" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
        {showUsername && (
          <p className="truncate text-xs text-muted-foreground leading-tight">@{account.username}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {account.platform}
          </span>
          <HealthBadge status={account.healthStatus ?? 'healthy'} />
        </div>
      </div>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-primary">
        {checked ? <Check size={11} /> : null}
      </span>
    </label>
  )
}
