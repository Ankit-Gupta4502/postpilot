export function localToUTC(localDT: string, timeZone: string): string {
  // Treat localDT as if UTC, compute how the target TZ renders that moment,
  // then derive the offset and produce the true UTC equivalent.
  const approx = new Date(`${localDT}:00Z`)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(approx)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  const tzDate = new Date(
    Date.UTC(
      parseInt(get('year'), 10),
      parseInt(get('month'), 10) - 1,
      parseInt(get('day'), 10),
      parseInt(get('hour'), 10) % 24,
      parseInt(get('minute'), 10),
      parseInt(get('second'), 10),
    ),
  )

  const offsetMs = approx.getTime() - tzDate.getTime()
  return new Date(approx.getTime() + offsetMs).toISOString()
}

export function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function getAllTimezones(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Intl as any).supportedValuesOf('timeZone') as string[]
  } catch {
    return COMMON_TIMEZONES
  }
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Halifax',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
]
