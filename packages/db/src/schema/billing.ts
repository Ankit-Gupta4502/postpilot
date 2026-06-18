import { pgTable, text, timestamp, uuid, bigint, boolean } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { organizations } from './organizations'

export const billingCustomers = pgTable('billing_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().unique().references(() => organizations.id, { onDelete: 'cascade' }),
  razorpayCustomerId: text('razorpay_customer_id').unique(),
  email: text('email'),
  contact: text('contact'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  razorpaySubscriptionId: text('razorpay_subscription_id').unique().notNull(),
  razorpayPlanId: text('razorpay_plan_id').notNull(),
  plan: text('plan', { enum: ['starter', 'pro', 'agency'] }).notNull(),
  status: text('status', { enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'] }).notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  shortUrl: text('short_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  razorpayOrderId: text('razorpay_order_id').unique().notNull(),
  purpose: text('purpose', { enum: ['plan_upgrade', 'annual', 'addon', 'topup'] }).notNull(),
  targetPlan: text('target_plan'),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('INR'),
  receipt: text('receipt'),
  status: text('status', { enum: ['created', 'attempted', 'paid', 'failed'] }).notNull().default('created'),
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  razorpayPaymentId: text('razorpay_payment_id').unique().notNull(),
  razorpayOrderId: text('razorpay_order_id'),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').notNull(),
  status: text('status', { enum: ['created', 'authorized', 'captured', 'refunded', 'failed'] }).notNull(),
  method: text('method'),
  captured: boolean('captured').notNull().default(false),
  fee: bigint('fee', { mode: 'number' }),
  tax: bigint('tax', { mode: 'number' }),
  errorCode: text('error_code'),
  errorDescription: text('error_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
})

export const refunds = pgTable('refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  razorpayRefundId: text('razorpay_refund_id').unique().notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  status: text('status', { enum: ['pending', 'processed', 'failed'] }).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  razorpayEventId: text('razorpay_event_id').unique().notNull(),
  eventType: text('event_type').notNull(),
  payload: text('payload').notNull(),
  signatureValid: boolean('signature_valid').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  status: text('status', { enum: ['received', 'processed', 'ignored', 'failed'] }).notNull().default('received'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type BillingCustomer = typeof billingCustomers.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Order = typeof orders.$inferSelect
export type Payment = typeof payments.$inferSelect
