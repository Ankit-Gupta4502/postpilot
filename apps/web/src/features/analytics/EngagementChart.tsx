import { useMemo } from 'react'
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@postpilot/ui'
import { fmtDateKey } from '../../lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@postpilot/ui'

interface Snapshot {
  platformPostId: string
  likes: number | null
  comments: number | null
  shares: number | null
  views: number | null
  capturedAt: string
}

interface Props {
  snapshots: Snapshot[]
  isLoading?: boolean
}

const chartConfig = {
  likes: { label: 'Likes', color: 'var(--color-rose-500)' },
  comments: { label: 'Comments', color: 'var(--color-sky-500)' },
  shares: { label: 'Shares', color: 'var(--color-emerald-500)' },
} satisfies ChartConfig

interface DayBucket {
  date: string
  likes: number
  comments: number
  shares: number
}

function toDateKey(isoStr: string): string {
  return isoStr.slice(0, 10)
}

export function EngagementChart({ snapshots, isLoading }: Props) {
  const data = useMemo<DayBucket[]>(() => {
    const buckets = new Map<string, DayBucket>()
    for (const s of snapshots) {
      const key = toDateKey(s.capturedAt)
      const existing = buckets.get(key) ?? { date: key, likes: 0, comments: 0, shares: 0 }
      existing.likes += s.likes ?? 0
      existing.comments += s.comments ?? 0
      existing.shares += s.shares ?? 0
      buckets.set(key, existing)
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
  }, [snapshots])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Engagement Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No analytics data yet. Sync your account to see engagement trends.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDateKey}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="likes"
                  stroke="var(--color-rose-500)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="comments"
                  stroke="var(--color-sky-500)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="shares"
                  stroke="var(--color-emerald-500)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
