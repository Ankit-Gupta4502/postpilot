import { Badge } from '@postpilot/ui'

const VARIANT_MAP: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  healthy: 'success',
  warning: 'warning',
  broken: 'destructive',
}

export function HealthBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT_MAP[status] ?? 'outline'}>
      {status}
    </Badge>
  )
}
