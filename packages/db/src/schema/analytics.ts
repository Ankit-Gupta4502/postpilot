import { pgTable, uuid, bigint, timestamp, index } from 'drizzle-orm/pg-core'
import { platformPosts } from './posts'

export const postMetricSnapshots = pgTable('post_metric_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  platformPostId: uuid('platform_post_id').notNull().references(() => platformPosts.id, { onDelete: 'cascade' }),
  likes: bigint('likes', { mode: 'number' }),
  comments: bigint('comments', { mode: 'number' }),
  shares: bigint('shares', { mode: 'number' }),
  views: bigint('views', { mode: 'number' }),
  reach: bigint('reach', { mode: 'number' }),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('post_metric_snapshots_post_time_idx').on(t.platformPostId, t.capturedAt),
])

export type PostMetricSnapshot = typeof postMetricSnapshots.$inferSelect
export type NewPostMetricSnapshot = typeof postMetricSnapshots.$inferInsert
