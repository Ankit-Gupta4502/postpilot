import { pgTable, text, timestamp, uuid, integer, bigint, boolean, index, unique } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { organizations } from './organizations'
import { workspaces } from './workspaces'
import { socialAccounts } from './social'

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => users.id),
  content: text('content'),
  status: text('status', { enum: ['draft', 'scheduled', 'publishing', 'published', 'partial', 'failed'] }).notNull().default('draft'),
  scheduledForUtc: timestamp('scheduled_for_utc', { withTimezone: true }),
  scheduledTimezone: text('scheduled_timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('posts_workspace_status_idx').on(t.workspaceId, t.status),
  index('posts_scheduled_idx').on(t.scheduledForUtc),
])

export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  mimeType: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'),
  status: text('status', { enum: ['uploading', 'ready', 'failed'] }).notNull().default('uploading'),
  checksum: text('checksum'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('media_checksum_org_idx').on(t.checksum, t.orgId),
])

export const syndicationJobs = pgTable('syndication_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  socialAccountId: uuid('social_account_id').notNull().references(() => socialAccounts.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  status: text('status', { enum: ['queued', 'running', 'success', 'failed', 'retrying', 'cancelled'] }).notNull().default('queued'),
  attempts: integer('attempts').notNull().default(0),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  errorMessage: text('error_message'),
  publishedPostId: text('published_post_id'),
  processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
  leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
  queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => [
  unique().on(t.postId, t.socialAccountId),
  index('syndication_jobs_status_idx').on(t.status),
  index('syndication_jobs_lease_idx').on(t.leaseExpiresAt),
])

export const platformPosts = pgTable('platform_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  socialAccountId: uuid('social_account_id').notNull().references(() => socialAccounts.id, { onDelete: 'cascade' }),
  platformPostId: text('platform_post_id').notNull(),
  content: text('content'),
  mediaUrls: text('media_urls').array(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  likesCount: bigint('likes_count', { mode: 'number' }).default(0),
  commentsCount: bigint('comments_count', { mode: 'number' }).default(0),
  sharesCount: bigint('shares_count', { mode: 'number' }).default(0),
  viewsCount: bigint('views_count', { mode: 'number' }).default(0),
  reach: bigint('reach', { mode: 'number' }).default(0),
  isOurs: boolean('is_ours').notNull().default(false),
  rawData: text('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  unique().on(t.socialAccountId, t.platformPostId),
  index('platform_posts_account_idx').on(t.socialAccountId, t.publishedAt),
])

export const syncState = pgTable('sync_state', {
  id: uuid('id').defaultRandom().primaryKey(),
  socialAccountId: uuid('social_account_id').notNull().references(() => socialAccounts.id, { onDelete: 'cascade' }),
  syncType: text('sync_type', { enum: ['posts', 'analytics', 'profile'] }).notNull(),
  checkpointType: text('checkpoint_type', { enum: ['cursor', 'page_token', 'since_id', 'offset', 'time_watermark'] }),
  checkpointValue: text('checkpoint_value'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  isPaused: boolean('is_paused').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  unique().on(t.socialAccountId, t.syncType),
])

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type Media = typeof media.$inferSelect
export type SyndicationJob = typeof syndicationJobs.$inferSelect
export type PlatformPost = typeof platformPosts.$inferSelect
export type SyncState = typeof syncState.$inferSelect
