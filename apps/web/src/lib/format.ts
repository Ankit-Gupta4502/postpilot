/**
 * Shared formatting utilities.
 * Import from here — never define local fmt/formatDate functions in feature files.
 */

/** Format a large integer into a compact string: 1_200 → "1.2K", 1_500_000 → "1.5M". */
export function fmtCount(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Format an ISO timestamp as a short date+time: "19 Jun, 3:45 PM". */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format an ISO timestamp as a compact date: "19 Jun '26". */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}

/** Format a YYYY-MM-DD string as "MM/DD" for chart axis labels. */
export function fmtDateKey(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${m}/${d}`
}
