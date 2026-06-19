import { Heart, MessageCircle, Share2, Eye } from 'lucide-react'
import {
  Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@postpilot/ui'
import { fmtCount, fmtDate } from '../../lib/format'

interface Post {
  id: string
  platformPostId: string
  content: string | null
  publishedAt: string | null
  likesCount: number | null
  commentsCount: number | null
  sharesCount: number | null
  viewsCount: number | null
}

interface Props {
  posts: Post[]
}

export function TopPostsTable({ posts }: Props) {
  const sorted = [...posts].sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Top Posts by Engagement</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No posts synced yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead><span className="flex items-center gap-1"><Heart size={12} /> Likes</span></TableHead>
                  <TableHead><span className="flex items-center gap-1"><MessageCircle size={12} /> Comments</span></TableHead>
                  <TableHead><span className="flex items-center gap-1"><Share2 size={12} /> Shares</span></TableHead>
                  <TableHead><span className="flex items-center gap-1"><Eye size={12} /> Views</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.slice(0, 20).map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-xs">
                      <p className="truncate">
                        {post.content?.slice(0, 80) ?? (
                          <span className="italic text-muted-foreground">No caption</span>
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {fmtDate(post.publishedAt)}
                    </TableCell>
                    <TableCell className="font-medium">{fmtCount(post.likesCount)}</TableCell>
                    <TableCell className="font-medium">{fmtCount(post.commentsCount)}</TableCell>
                    <TableCell className="font-medium">{fmtCount(post.sharesCount)}</TableCell>
                    <TableCell className="font-medium">{fmtCount(post.viewsCount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
