import type { ReactNode } from 'react'
import { Heart, MessageCircle, Share2, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@postpilot/ui'
import { fmtCount } from '../../lib/format'

interface Post {
  likesCount: number | null
  commentsCount: number | null
  sharesCount: number | null
  viewsCount: number | null
}

interface Props {
  totalPosts: number
  posts: Post[]
}

function StatCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  title: string
  value: string
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

export function SummaryCards({ totalPosts, posts }: Props) {
  const totalLikes = posts.reduce((s, p) => s + (p.likesCount ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.commentsCount ?? 0), 0)
  const totalShares = posts.reduce((s, p) => s + (p.sharesCount ?? 0), 0)
  const totalViews = posts.reduce((s, p) => s + (p.viewsCount ?? 0), 0)

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard title="Total Posts" value={fmtCount(totalPosts)} icon={<Eye size={18} />} iconBg="bg-primary/10" iconColor="text-primary" />
      <StatCard title="Total Likes" value={fmtCount(totalLikes)} icon={<Heart size={18} />} iconBg="bg-rose-50" iconColor="text-rose-500" />
      <StatCard title="Comments" value={fmtCount(totalComments)} icon={<MessageCircle size={18} />} iconBg="bg-sky-50" iconColor="text-sky-600" />
      <StatCard title="Shares / Views" value={fmtCount(totalViews > 0 ? totalViews : totalShares)} icon={<Share2 size={18} />} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
    </div>
  )
}
