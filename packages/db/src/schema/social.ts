import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { organizations } from './organizations'
import { workspaces } from './workspaces'

export const oauthStates = pgTable('oauth_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  state: text('state').unique().notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  redirectUri: text('redirect_uri').notNull(),
  codeVerifier: text('code_verifier'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  platform: text('platform', { enum: ['instagram', 'facebook', 'linkedin', 'x', 'youtube'] }).notNull(),
  platformAccountId: text('platform_account_id').notNull(),
  username: text('username'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scopes: text('scopes').array(),
  status: text('status', { enum: ['connected', 'expired', 'revoked', 'paused', 'error'] }).notNull().default('connected'),
  healthStatus: text('health_status', { enum: ['healthy', 'warning', 'broken'] }).notNull().default('healthy'),
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
  lastErrorMessage: text('last_error_message'),
  lastPostSyncAt: timestamp('last_post_sync_at', { withTimezone: true }),
  lastAnalyticsSyncAt: timestamp('last_analytics_sync_at', { withTimezone: true }),
  lastDashboardViewAt: timestamp('last_dashboard_view_at', { withTimezone: true }),
  analyticsSyncPriority: text('analytics_sync_priority', { enum: ['hot', 'warm', 'cold'] }).notNull().default('warm'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('social_accounts_workspace_platform_idx').on(t.workspaceId, t.platform),
])

export type SocialAccount = typeof socialAccounts.$inferSelect
export type NewSocialAccount = typeof socialAccounts.$inferInsert
