import type { FastifyPluginAsync } from 'fastify'
import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { ok, created, fail } from '../lib/response'

let _rp: Razorpay | null = null

function rp(): Razorpay {
  if (!_rp) {
    _rp = new Razorpay({
      key_id: process.env['RAZORPAY_KEY_ID'] ?? '',
      key_secret: process.env['RAZORPAY_KEY_SECRET'] ?? '',
    })
  }
  return _rp
}

/** Maps our plan names to the Razorpay plan IDs from env. */
function razorpayPlanId(plan: string): string {
  const key = `RAZORPAY_PLAN_ID_${plan.toUpperCase()}`
  const id = process.env[key]
  if (!id) throw new Error(`${key} env var is not set`)
  return id
}

export const billingRouter: FastifyPluginAsync = async (fastify) => {
  // ── Static plan info ────────────────────────────────────────────────────────
  fastify.get('/plans', async (_req, reply) => {
    return ok(reply, {
      data: [
        { plan: 'free', price: 0, currency: 'INR', features: { teams: false, approvals: false, white_label: false } },
        { plan: 'starter', price: 99900, currency: 'INR', features: { teams: false, approvals: false, white_label: false } },
        { plan: 'pro', price: 299900, currency: 'INR', features: { teams: true, approvals: false, white_label: false } },
        { plan: 'agency', price: 799900, currency: 'INR', features: { teams: true, approvals: true, white_label: true } },
      ],
      message: 'Plans retrieved',
    })
  })

  // ── Create subscription ─────────────────────────────────────────────────────
  /**
   * POST /api/billing/subscribe
   * Creates a Razorpay subscription for the org. Returns the subscription's
   * short_url so the frontend can open Razorpay Checkout.
   */
  fastify.post<{ Body: { plan: 'starter' | 'pro' | 'agency' } }>(
    '/subscribe',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { plan } = req.body
      const orgId = req.orgId!

      if (!['owner', 'admin', 'billing'].includes(req.orgRole ?? '')) {
        return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Billing access required' })
      }

      // Ensure billing customer exists
      let customer = await db.query.billingCustomers.findFirst({
        where: eq(schema.billingCustomers.orgId, orgId),
      })
      if (!customer) {
        const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) })
        if (!org) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Organization not found' })

        const rpCustomer = await rp().customers.create({ name: org.name })
        const [newCustomer] = await db.insert(schema.billingCustomers).values({
          orgId,
          razorpayCustomerId: rpCustomer.id,
        }).returning()
        customer = newCustomer!
      }

      // Create Razorpay subscription
      const rpSub = await rp().subscriptions.create({
        plan_id: razorpayPlanId(plan),
        customer_notify: 1,
        quantity: 1,
        total_count: 12, // 12 billing cycles; set to 0 for indefinite
        notes: { org_id: orgId, plan },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as { id: string; short_url?: string }

      // Persist locally
      const [sub] = await db.insert(schema.subscriptions).values({
        orgId,
        razorpaySubscriptionId: rpSub.id,
        razorpayPlanId: razorpayPlanId(plan),
        plan,
        status: 'created',
        shortUrl: rpSub.short_url,
      }).returning()

      await db.insert(schema.auditLog).values({
        orgId,
        actorUser: req.userId!,
        action: 'billing.subscription_created',
        targetType: 'subscription',
        targetId: sub!.id,
        metadata: JSON.stringify({ plan, razorpaySubscriptionId: rpSub.id }),
      }).catch(() => {})

      return created(reply, {
        data: { subscriptionId: rpSub.id, shortUrl: rpSub.short_url, plan },
        message: 'Subscription created',
      })
    }
  )

  // ── One-off order ───────────────────────────────────────────────────────────
  fastify.post<{ Body: { plan: 'starter' | 'pro' | 'agency'; amount: number; currency?: string } }>(
    '/orders',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      if (!['owner', 'admin', 'billing'].includes(req.orgRole ?? '')) {
        return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Billing access required' })
      }

      const { plan, amount } = req.body
      const currency = req.body.currency ?? 'INR'
      const orgId = req.orgId!
      const receipt = `pp_${orgId}_${Date.now()}`

      const rpOrder = await rp().orders.create({
        amount,
        currency,
        receipt,
        notes: { org_id: orgId, target_plan: plan },
      })

      await db.insert(schema.orders).values({
        orgId,
        razorpayOrderId: rpOrder.id,
        purpose: 'plan_upgrade',
        targetPlan: plan,
        amount,
        currency,
        receipt,
        status: 'created',
        notes: JSON.stringify({ org_id: orgId, target_plan: plan }),
        createdBy: req.userId!,
      })

      return created(reply, { data: { orderId: rpOrder.id, amount, currency, receipt }, message: 'Order created' })
    }
  )

  // ── Cancel subscription ─────────────────────────────────────────────────────
  fastify.post<{ Params: { subscriptionId: string }; Body: { cancelAtPeriodEnd?: boolean } }>(
    '/subscriptions/:subscriptionId/cancel',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      if (!['owner', 'admin', 'billing'].includes(req.orgRole ?? '')) {
        return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Billing access required' })
      }

      const sub = await db.query.subscriptions.findFirst({
        where: and(
          eq(schema.subscriptions.id, req.params.subscriptionId),
          eq(schema.subscriptions.orgId, req.orgId!)
        ),
      })
      if (!sub) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Subscription not found' })

      const cancelNow = !(req.body.cancelAtPeriodEnd ?? true)
      await rp().subscriptions.cancel(sub.razorpaySubscriptionId, cancelNow)

      await db.update(schema.subscriptions)
        .set({ cancelAtPeriodEnd: !cancelNow, updatedAt: new Date() })
        .where(eq(schema.subscriptions.id, sub.id))

      await db.update(schema.organizations)
        .set({ planStatus: 'cancelled', updatedAt: new Date() })
        .where(eq(schema.organizations.id, req.orgId!))

      await db.insert(schema.auditLog).values({
        orgId: req.orgId!,
        actorUser: req.userId!,
        action: 'billing.subscription_cancelled',
        targetType: 'subscription',
        targetId: sub.id,
        metadata: JSON.stringify({ cancelNow }),
      }).catch(() => {})

      return ok(reply, { data: { cancelled: true }, message: 'Subscription cancelled' })
    }
  )

  // ── Razorpay webhook handler ─────────────────────────────────────────────────
  /**
   * POST /api/webhooks/razorpay
   *
   * This route handles the Razorpay webhook state machine (§17.5):
   *   1. Verify HMAC signature
   *   2. Deduplicate via razorpay_event_id
   *   3. Apply state changes to subscriptions / payments / organizations
   */
  fastify.post(
    '/webhooks/razorpay',
    async (req, reply) => {
      const rawBody = JSON.stringify(req.body)
      const signature = req.headers['x-razorpay-signature'] as string
      const secret = process.env['RAZORPAY_WEBHOOK_SECRET']!

      // 1. Verify signature
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
      if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return reply.status(400).send({ error: 'Invalid signature' })
      }

      const body = req.body as {
        event: string
        payload?: {
          payment?: { entity?: RazorpayPaymentEntity }
          subscription?: { entity?: RazorpaySubscriptionEntity }
          order?: { entity?: { id?: string; status?: string } }
          refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } }
        }
      }

      const eventId = req.headers['x-razorpay-event-id'] as string | undefined
      if (!eventId) return reply.status(400).send({ error: 'Missing event id header' })

      // 2. Idempotency — record the event; unique violation means duplicate
      try {
        await db.insert(schema.webhookEvents).values({
          razorpayEventId: eventId,
          eventType: body.event,
          payload: rawBody,
          signatureValid: true,
          status: 'received',
        })
      } catch (_err) {
        // Unique constraint violation = already processed
        return reply.send({ received: true, duplicate: true })
      }

      // 3. Process event
      try {
        await processRazorpayEvent(body, eventId)
        await db.update(schema.webhookEvents)
          .set({ status: 'processed', processedAt: new Date() })
          .where(eq(schema.webhookEvents.razorpayEventId, eventId))
      } catch (err) {
        fastify.log.error({ err, eventId, eventType: body.event }, 'Razorpay webhook processing failed')
        await db.update(schema.webhookEvents)
          .set({ status: 'failed' })
          .where(eq(schema.webhookEvents.razorpayEventId, eventId))
        return reply.status(500).send({ error: 'Processing failed' })
      }

      return reply.send({ received: true })
    }
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface RazorpayPaymentEntity {
  id?: string
  order_id?: string
  amount?: number
  currency?: string
  status?: string
  method?: string
  captured?: boolean
  fee?: number
  tax?: number
  error_code?: string
  error_description?: string
  description?: string
  notes?: Record<string, string>
  created_at?: number
  subscription_id?: string
}

interface RazorpaySubscriptionEntity {
  id?: string
  plan_id?: string
  status?: string
  current_start?: number
  current_end?: number
  notes?: Record<string, string>
}

// ── Event processor ────────────────────────────────────────────────────────────

async function processRazorpayEvent(
  body: {
    event: string
    payload?: {
      payment?: { entity?: RazorpayPaymentEntity }
      subscription?: { entity?: RazorpaySubscriptionEntity }
      order?: { entity?: { id?: string; status?: string } }
      refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } }
    }
  },
  _eventId: string
): Promise<void> {
  const { event, payload } = body

  switch (event) {
    case 'payment.captured':
    case 'payment.authorized': {
      const pmt = payload?.payment?.entity
      if (!pmt?.id) return
      await handlePayment(pmt, event === 'payment.captured')
      break
    }

    case 'payment.failed': {
      const pmt = payload?.payment?.entity
      if (!pmt?.id) return
      await handlePaymentFailed(pmt)
      break
    }

    case 'subscription.activated':
    case 'subscription.charged': {
      const sub = payload?.subscription?.entity
      if (!sub?.id) return
      await handleSubscriptionActivated(sub)
      break
    }

    case 'subscription.halted': {
      const sub = payload?.subscription?.entity
      if (!sub?.id) return
      await handleSubscriptionHalted(sub)
      break
    }

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.expired': {
      const sub = payload?.subscription?.entity
      if (!sub?.id) return
      await handleSubscriptionTerminal(sub, event.split('.')[1] as 'cancelled' | 'completed' | 'expired')
      break
    }

    case 'order.paid': {
      const orderEntity = payload?.order?.entity
      if (!orderEntity?.id) return
      await handleOrderPaid(orderEntity.id)
      break
    }

    case 'refund.processed': {
      const refund = payload?.refund?.entity
      if (!refund?.id || !refund.payment_id) return
      // Find payment by razorpay_payment_id
      const pmtRow = await db.query.payments.findFirst({
        where: eq(schema.payments.razorpayPaymentId, refund.payment_id),
      })
      if (!pmtRow) return
      await db.insert(schema.refunds).values({
        paymentId: pmtRow.id,
        razorpayRefundId: refund.id,
        amount: refund.amount ?? 0,
        status: 'processed',
        reason: null,
      }).onConflictDoNothing()
      break
    }

    default:
      break
  }
}

async function handlePayment(pmt: RazorpayPaymentEntity, captured: boolean): Promise<void> {
  // Find the org by notes or by subscription
  let orgId: string | undefined

  if (pmt.subscription_id) {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.razorpaySubscriptionId, pmt.subscription_id),
    })
    orgId = sub?.orgId
  } else if (pmt.notes?.['org_id']) {
    orgId = pmt.notes['org_id']
  }

  if (!orgId) return

  await db.insert(schema.payments).values({
    orgId,
    razorpayPaymentId: pmt.id!,
    razorpayOrderId: pmt.order_id,
    subscriptionId: pmt.subscription_id
      ? (await db.query.subscriptions.findFirst({
          where: eq(schema.subscriptions.razorpaySubscriptionId, pmt.subscription_id),
        }))?.id
      : null,
    amount: pmt.amount ?? 0,
    currency: pmt.currency ?? 'INR',
    status: captured ? 'captured' : 'authorized',
    method: pmt.method,
    captured,
    fee: pmt.fee,
    tax: pmt.tax,
    paidAt: pmt.created_at ? new Date(pmt.created_at * 1000) : new Date(),
  }).onConflictDoUpdate({
    target: schema.payments.razorpayPaymentId,
    set: { status: captured ? 'captured' : 'authorized', captured },
  })
}

async function handlePaymentFailed(pmt: RazorpayPaymentEntity): Promise<void> {
  let orgId: string | undefined
  if (pmt.subscription_id) {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.razorpaySubscriptionId, pmt.subscription_id),
    })
    orgId = sub?.orgId
  } else if (pmt.notes?.['org_id']) {
    orgId = pmt.notes['org_id']
  }
  if (!orgId) return

  await db.insert(schema.payments).values({
    orgId,
    razorpayPaymentId: pmt.id!,
    razorpayOrderId: pmt.order_id,
    amount: pmt.amount ?? 0,
    currency: pmt.currency ?? 'INR',
    status: 'failed',
    method: pmt.method,
    captured: false,
    errorCode: pmt.error_code,
    errorDescription: pmt.error_description,
  }).onConflictDoUpdate({
    target: schema.payments.razorpayPaymentId,
    set: { status: 'failed', errorCode: pmt.error_code, errorDescription: pmt.error_description },
  })

  // Set org past_due with grace period
  const graceDays = Number(process.env['PAST_DUE_GRACE_DAYS'] ?? 7)
  const graceUntil = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000)
  await db.update(schema.organizations)
    .set({ planStatus: 'past_due', graceUntil, updatedAt: new Date() })
    .where(eq(schema.organizations.id, orgId))
}

async function handleSubscriptionActivated(sub: RazorpaySubscriptionEntity): Promise<void> {
  const localSub = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.razorpaySubscriptionId, sub.id!),
  })
  if (!localSub) return

  await db.update(schema.subscriptions).set({
    status: 'active',
    currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : undefined,
    currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
    updatedAt: new Date(),
  }).where(eq(schema.subscriptions.id, localSub.id))

  // Activate the org plan
  await db.update(schema.organizations).set({
    plan: localSub.plan,
    planStatus: 'active',
    graceUntil: null,
    updatedAt: new Date(),
  }).where(eq(schema.organizations.id, localSub.orgId))

  await db.insert(schema.auditLog).values({
    orgId: localSub.orgId,
    action: 'billing.plan_activated',
    targetType: 'subscription',
    targetId: localSub.id,
    metadata: JSON.stringify({ plan: localSub.plan }),
  }).catch(() => {})
}

async function handleSubscriptionHalted(sub: RazorpaySubscriptionEntity): Promise<void> {
  const localSub = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.razorpaySubscriptionId, sub.id!),
  })
  if (!localSub) return

  await db.update(schema.subscriptions).set({ status: 'halted', updatedAt: new Date() })
    .where(eq(schema.subscriptions.id, localSub.id))

  const graceDays = Number(process.env['PAST_DUE_GRACE_DAYS'] ?? 7)
  const graceUntil = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000)
  await db.update(schema.organizations).set({
    planStatus: 'past_due', graceUntil, updatedAt: new Date(),
  }).where(eq(schema.organizations.id, localSub.orgId))
}

async function handleSubscriptionTerminal(
  sub: RazorpaySubscriptionEntity,
  reason: 'cancelled' | 'completed' | 'expired'
): Promise<void> {
  const localSub = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.razorpaySubscriptionId, sub.id!),
  })
  if (!localSub) return

  await db.update(schema.subscriptions).set({ status: reason, updatedAt: new Date() })
    .where(eq(schema.subscriptions.id, localSub.id))

  await db.update(schema.organizations).set({
    plan: 'free',
    planStatus: 'expired',
    updatedAt: new Date(),
  }).where(eq(schema.organizations.id, localSub.orgId))

  await db.insert(schema.auditLog).values({
    orgId: localSub.orgId,
    action: 'billing.plan_expired',
    targetType: 'subscription',
    targetId: localSub.id,
    metadata: JSON.stringify({ reason }),
  }).catch(() => {})
}

async function handleOrderPaid(razorpayOrderId: string): Promise<void> {
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.razorpayOrderId, razorpayOrderId),
  })
  if (!order) return

  await db.update(schema.orders)
    .set({ status: 'paid', updatedAt: new Date() })
    .where(eq(schema.orders.id, order.id))

  if (order.purpose === 'plan_upgrade' && order.targetPlan) {
    await db.update(schema.organizations)
      .set({ plan: order.targetPlan as 'free' | 'starter' | 'pro' | 'agency', planStatus: 'active', updatedAt: new Date() })
      .where(eq(schema.organizations.id, order.orgId))
  }

  await db.insert(schema.auditLog).values({
    orgId: order.orgId,
    action: 'billing.order_paid',
    targetType: 'order',
    targetId: order.id,
    metadata: JSON.stringify({ razorpayOrderId, targetPlan: order.targetPlan }),
  }).catch(() => {})
}
