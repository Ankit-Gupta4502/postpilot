import type { ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, CheckCircle2, Clock, Link2, PlusCircle, BarChart2, Settings } from 'lucide-react'
import { Card, CardContent } from '@postpilot/ui'
import { useOrg } from '../lib/org-context'
import { queries } from '../lib/queries'
import { Shell } from '../components/layout/Shell'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string
  value: number
  icon: ReactNode
  accent: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickAction({
  to,
  icon,
  label,
  description,
}: {
  to: string
  icon: ReactNode
  label: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

function DashboardPage() {
  const { activeOrg, activeWorkspace } = useOrg()
  const wsId = activeWorkspace?.id ?? ''
  const orgId = activeOrg?.id ?? ''

  const { data: accounts = [] } = useQuery(queries.socialAccounts(wsId, orgId))
  const { data: posts = [] } = useQuery(queries.posts(wsId, orgId))

  const connectedAccounts = accounts.filter((a) => a.status === 'connected').length
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled').length
  const publishedPosts = posts.filter((p) => p.status === 'published').length

  return (
    <Shell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeWorkspace ? `Welcome back` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Posts"
            value={posts.length}
            icon={<FileText size={20} />}
            accent="bg-primary/10 text-primary"
          />
          <StatCard
            title="Published"
            value={publishedPosts}
            icon={<CheckCircle2 size={20} />}
            accent="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            title="Scheduled"
            value={scheduledPosts}
            icon={<Clock size={20} />}
            accent="bg-amber-100 text-amber-600"
          />
          <StatCard
            title="Connected Accounts"
            value={connectedAccounts}
            icon={<Link2 size={20} />}
            accent="bg-sky-100 text-sky-600"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickAction
              to="/compose"
              icon={<PlusCircle size={18} />}
              label="Create post"
              description="Write and schedule content"
            />
            <QuickAction
              to="/analytics"
              icon={<BarChart2 size={18} />}
              label="View analytics"
              description="Track engagement and reach"
            />
            <QuickAction
              to="/settings"
              icon={<Settings size={18} />}
              label="Settings"
              description="Manage your organization"
            />
          </div>
        </div>

        {/* Recent posts */}
        {posts.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent posts
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {posts.slice(0, 5).map((post, i) => (
                <div
                  key={post.id}
                  className={`flex items-center gap-4 px-5 py-4 ${i < Math.min(posts.length, 5) - 1 ? 'border-b border-border' : ''}`}
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      post.status === 'published'
                        ? 'bg-emerald-500'
                        : post.status === 'scheduled'
                          ? 'bg-amber-500'
                          : 'bg-muted-foreground'
                    }`}
                  />
                  <p className="flex-1 truncate text-sm">{post.content ?? '(no content)'}</p>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {post.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
