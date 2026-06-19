import { Badge } from '@postpilot/ui'
import { CheckSquare2, Users2 } from 'lucide-react'
import { PlatformCheckbox } from './PlatformCheckbox'
import { PlatformIcon } from './PlatformIcon'

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

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin', 'x', 'youtube']

const PLATFORM_ACCENT: Record<string, string> = {
  instagram: 'from-pink-500 via-rose-500 to-amber-400',
  facebook: 'from-blue-600 to-blue-700',
  linkedin: 'from-sky-600 to-cyan-600',
  x: 'from-neutral-900 to-neutral-700',
  youtube: 'from-red-500 to-red-600',
}

export function PlatformSelector({ accounts, selectedIds, onChange }: PlatformSelectorProps) {
  const connected = accounts.filter((a) => a.status === 'connected')

  if (connected.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        No connected accounts yet.{' '}
        <a href="/accounts" className="font-medium text-primary underline underline-offset-2">
          Connect one first.
        </a>
      </div>
    )
  }

  const platforms = [...new Set(connected.map((account) => account.platform))].sort(
    (a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b)
  )
  const allSelected = connected.every((account) => selectedIds.includes(account.id))

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users2 size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold">Connected accounts</p>
            <p className="text-[11px] text-muted-foreground">Pick the accounts that should publish.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
            {selectedIds.length} selected
          </Badge>
          {connected.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(allSelected ? [] : connected.map((a) => a.id))}
              className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/20 hover:bg-primary/5"
            >
              {allSelected ? 'Clear' : 'Select all'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2">
        {platforms.map((platform) => {
          const platformAccounts = connected.filter((account) => account.platform === platform)
          const selectedCount = platformAccounts.filter((account) => selectedIds.includes(account.id)).length
          const gradient = PLATFORM_ACCENT[platform] ?? 'from-muted to-muted'

          return (
            <section
              key={platform}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm"
            >
              <div className={`h-1 bg-gradient-to-r ${gradient}`} />
              <div className="p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <PlatformIcon platform={platform} size="md" />
                    <div>
                      <p className="text-sm font-semibold capitalize">{platform}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {platformAccounts.length} account{platformAccounts.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {selectedCount} on
                  </Badge>
                </div>

                <div className="space-y-2">
                  {platformAccounts.map((account) => (
                    <PlatformCheckbox
                      key={account.id}
                      account={account}
                      checked={selectedIds.includes(account.id)}
                      onChange={toggle}
                    />
                  ))}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-border/70 bg-background px-4 py-3 text-xs text-muted-foreground">
        <CheckSquare2 size={13} className="mr-1 inline-block align-[-2px]" />
        Selected accounts will receive the same content.
      </div>
    </div>
  )
}
