import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@postpilot/ui'
import { apiFetch } from '../../lib/api'
import { useOrg } from '../../lib/org-context'
import { fmtDateTime } from '../../lib/format'
import { queryKeys } from '../../lib/queries'

interface DeadLetterJob {
  id: string
  sourceQueue: string
  failureReason: string | null
  attempts: number | null
  firstFailedAt: string | null
  lastFailedAt: string | null
  replayedAt: string | null
  status: 'open' | 'replayed' | 'discarded'
  payload: unknown
}

interface Props {
  jobs: DeadLetterJob[]
  statusFilter: 'open' | 'replayed' | 'discarded'
}


const STATUS_BADGE: Record<string, string> = {
  open: 'destructive',
  replayed: 'secondary',
  discarded: 'outline',
}

export function DlqTable({ jobs, statusFilter }: Props) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const replay = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/dlq/${id}/replay`, { method: 'POST', orgId: activeOrg?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dlq() }),
  })

  const discard = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/dlq/${id}/discard`, { method: 'POST', orgId: activeOrg?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dlq() }),
  })

  if (jobs.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          No {statusFilter} jobs
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm font-mono">{job.sourceQueue}</CardTitle>
                  <Badge variant={STATUS_BADGE[job.status] as 'destructive' | 'secondary' | 'outline'}>
                    {job.status}
                  </Badge>
                  {(job.attempts ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">{job.attempts} attempt{job.attempts !== 1 ? 's' : ''}</span>
                  )}
                </div>
                {job.failureReason && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span className="break-all">{job.failureReason}</span>
                  </p>
                )}
              </div>

              {job.status === 'open' && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => replay.mutate(job.id)}
                    disabled={replay.isPending}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw size={12} />
                    Replay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => discard.mutate(job.id)}
                    disabled={discard.isPending}
                    className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 size={12} />
                    Discard
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>First failed: {fmtDateTime(job.firstFailedAt)}</span>
              <span>Last failed: {fmtDateTime(job.lastFailedAt)}</span>
              {job.replayedAt && <span>Replayed: {fmtDateTime(job.replayedAt)}</span>}
            </div>

            <button
              onClick={() => setExpanded(expanded === job.id ? null : job.id)}
              className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {expanded === job.id ? 'Hide payload' : 'Show payload'}
            </button>

            {expanded === job.id && (
              <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
