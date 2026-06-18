import { getAllTimezones } from '../../lib/timezone'

interface TimezoneSelectProps {
  value: string
  onChange: (tz: string) => void
}

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  const timezones = getAllTimezones()

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {timezones.map((tz) => (
        <option key={tz} value={tz}>
          {tz}
        </option>
      ))}
    </select>
  )
}
