import { PlatformIcon } from '../accounts/PlatformIcon'

interface Account {
  id: string
  platform: string
  username: string | null
  displayName: string | null
  status: string
}

interface Props {
  accounts: Account[]
  selectedId: string | null
  onChange: (id: string) => void
}

export function AccountSelector({ accounts, selectedId, onChange }: Props) {
  const connected = accounts.filter((a) => a.status === 'connected')

  if (connected.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No connected accounts. <a href="/accounts" className="text-primary underline underline-offset-2">Connect one →</a>
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connected.map((account) => {
        const label = account.displayName ?? account.username ?? account.platform
        const isSelected = account.id === selectedId
        return (
          <button
            key={account.id}
            onClick={() => onChange(account.id)}
            className={[
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
            ].join(' ')}
          >
            <PlatformIcon platform={account.platform} size="sm" />
            <span className="truncate max-w-30">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
