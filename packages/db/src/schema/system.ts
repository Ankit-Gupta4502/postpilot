import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { organizations } from './organizations.js'

export const deadLetterJobs = pgTable('dead_letter_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceQueue: text('source_queue').notNull(),
  payload: jsonb('payload').notNull(),
  jobRef: uuid('job_ref'),
  failureReason: text('failure_reason'),
  attempts: integer('attempts'),
  firstFailedAt: timestamp('first_failed_at', { withTimezone: true }),
  lastFailedAt: timestamp('last_failed_at', { withTimezone: true }),
  replayedAt: timestamp('replayed_at', { withTimezone: true }),
  status: text('status', { enum: ['open', 'replayed', 'discarded'] }).notNull().default('open'),
})

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  actorUser: text('actor_user').references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const emailEvents = pgTable('email_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'set null' }),
  recipient: text('recipient').notNull(),
  template: text('template').notNull(),
  status: text('status', { enum: ['queued', 'sent', 'delivered', 'bounced', 'failed'] }).notNull().default('queued'),
  providerMessageId: text('provider_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
export type DeadLetterJob = typeof deadLetterJobs.$inferSelect
export type EmailEvent = typeof emailEvents.$inferSelect
