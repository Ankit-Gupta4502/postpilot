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
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <div>
          <span className="text-sm font-semibold">Schedule for later</span>
          <p className="text-xs text-muted-foreground">Pick a future date and the queue will handle the rest.</p>
        </div>
      </label>

      {enabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date &amp; time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => onScheduledAtChange(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Timezone</label>
            <TimezoneSelect value={timezone} onChange={onTimezoneChange} />
          </div>
        </div>
      )}
    </div>
  )
}
