import { TimezoneSelect } from './TimezoneSelect'

interface ScheduleFieldProps {
  enabled: boolean
  onToggle: () => void
  scheduledAt: string
  timezone: string
  onScheduledAtChange: (v: string) => void
  onTimezoneChange: (v: string) => void
}

export function ScheduleField({
  enabled,
  onToggle,
  scheduledAt,
  timezone,
  onScheduledAtChange,
  onTimezoneChange,
}: ScheduleFieldProps) {
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <span className="text-sm font-medium">Schedule for later</span>
      </label>

      {enabled && (
        <div className="grid grid-cols-1 gap-3 pl-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Date &amp; time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => onScheduledAtChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Timezone</label>
            <TimezoneSelect value={timezone} onChange={onTimezoneChange} />
          </div>
        </div>
      )}
    </div>
  )
}
