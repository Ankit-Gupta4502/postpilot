import { PlatformCheckbox } from './PlatformCheckbox'

interface Account {
  id: string
  platform: string
  displayName: string | null
  username: string | null
  status: string
  healthStatus?: string
}

interface PlatformSelectorProps {
  accounts: Account[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function PlatformSelector({ accounts, selectedIds, onChange }: PlatformSelectorProps) {
  const connected = accounts.filter((a) => a.status === 'connected')

  if (connected.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No connected accounts.{' '}
        <a href="/accounts" className="text-primary underline underline-offset-2">
          Connect one first.
        </a>
      </p>
    )
  }

  const allSelected = connected.every((a) => selectedIds.includes(a.id))

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id))
  }

  function toggleAll() {
    onChange(allSelected ? [] : connected.map((a) => a.id))
  }

  return (
    <div className="space-y-2">
      {connected.length > 1 && (
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-primary underline underline-offset-2 hover:no-underline"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      )}
      {connected.map((account) => (
        <PlatformCheckbox
          key={account.id}
          account={account}
          checked={selectedIds.includes(account.id)}
          onChange={toggle}
        />
      ))}
    </div>
  )
}
