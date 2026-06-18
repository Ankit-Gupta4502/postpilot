import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, CheckCircle2, Clock, Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@postpilot/ui'
import { apiFetch } from '../lib/api'
import { useOrg } from '../lib/org-context'
import { Shell } from '../components/layout/Shell'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function StatCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  title: string
  value: number
  icon: ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const { activeOrg, activeWorkspace } = useOrg()

  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts', activeWorkspace?.id],
    queryFn: () =>
      apiFetch<{ id: string; status: string }[]>(`/api/social-accounts/${activeWorkspace!.id}`, {
        orgId: activeOrg!.id,
      }),
    enabled: !!activeOrg && !!activeWorkspace,
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', activeWorkspace?.id],
    queryFn: () =>
      apiFetch<{ id: string; status: string }[]>(`/api/posts?workspaceId=${activeWorkspace!.id}`, {
        orgId: activeOrg!.id,
      }),
    enabled: !!activeOrg && !!activeWorkspace,
  })

  const connectedAccounts = accounts.filter((a) => a.status === 'connected').length
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled').length
  const publishedPosts = posts.filter((p) => p.status === 'published').length

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Posts"
          value={posts.length}
          icon={<FileText size={18} />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Published"
          value={publishedPosts}
          icon={<CheckCircle2 size={18} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Scheduled"
          value={scheduledPosts}
          icon={<Clock size={18} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Connected"
          value={connectedAccounts}
          icon={<Link2 size={18} />}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
        />
      </div>
    </Shell>
  )
}
