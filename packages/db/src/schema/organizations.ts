import { pgTable, text, timestamp, uuid, jsonb, unique } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id),
  plan: text('plan', { enum: ['free', 'starter', 'pro', 'agency'] }).notNull().default('free'),
  planStatus: text('plan_status', { enum: ['active', 'past_due', 'cancelled', 'expired'] }).notNull().default('active'),
  graceUntil: timestamp('grace_until', { withTimezone: true }),
  planCheckedAt: timestamp('plan_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const orgMembers = pgTable('org_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'admin', 'billing', 'member'] }).notNull(),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  invitedBy: text('invited_by').references(() => users.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.orgId, t.userId)])

export const orgInvites = pgTable('org_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'billing', 'member'] }).notNull(),
  workspaceGrants: jsonb('workspace_grants'),
  tokenHash: text('token_hash').notNull(),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  status: text('status', { enum: ['pending', 'accepted', 'revoked', 'expired'] }).notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedBy: text('accepted_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const planLimits = pgTable('plan_limits', {
  plan: text('plan', { enum: ['free', 'starter', 'pro', 'agency'] }).primaryKey(),
  maxAccounts: text('max_accounts').notNull(),
  maxWorkspaces: text('max_workspaces').notNull(),
  maxMembers: text('max_members').notNull(),
  maxScheduled: text('max_scheduled'),
  analyticsRetentionDays: text('analytics_retention_days').notNull(),
  features: jsonb('features').notNull(),
})

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type OrgMember = typeof orgMembers.$inferSelect
export type OrgInvite = typeof orgInvites.$inferSelect
export type PlanLimit = typeof planLimits.$inferSelect
