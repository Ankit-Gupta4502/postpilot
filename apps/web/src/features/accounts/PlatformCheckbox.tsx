import { PlatformIcon } from './PlatformIcon'

interface Account {
  id: string
  platform: string
  displayName: string | null
  username: string | null
  status: string
}

interface PlatformCheckboxProps {
  account: Account
  checked: boolean
  onChange: (id: string, checked: boolean) => void
}

export function PlatformCheckbox({ account, checked, onChange }: PlatformCheckboxProps) {
  const label = account.displayName ?? account.username ?? account.platform

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
        checked
          ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:bg-muted'
      }`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input accent-primary"
        checked={checked}
        onChange={(e) => onChange(account.id, e.target.checked)}
      />
      <PlatformIcon platform={account.platform} />
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
    </label>
  )
}
