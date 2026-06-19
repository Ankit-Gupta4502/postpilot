const CONFIG: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  healthy:  { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', label: 'Connected' },
  warning:  { dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40',   label: 'Warning'   },
  broken:   { dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-950/40',       label: 'Broken'    },
}

export function HealthBadge({ status }: { status: string }) {
  const c = CONFIG[status] ?? { dot: 'bg-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted', label: status }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
