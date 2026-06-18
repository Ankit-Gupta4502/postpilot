import type { FastifyRequest, FastifyReply } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and, count } from 'drizzle-orm'
import { PLAN_LIMITS } from '@postpilot/shared'
import type { OrgPlan } from '@postpilot/shared'

export async function checkWorkspaceLimit(req: FastifyRequest, reply: FastifyReply) {
  if (!req.orgId) return
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, req.orgId),
  })
  if (!org) return

  if (org.planStatus !== 'active') {
    return reply.status(402).send({ code: 'PLAN_INACTIVE', plan_status: org.planStatus })
  }

  const limits = PLAN_LIMITS[org.plan as OrgPlan]
  if (limits.maxWorkspaces === null) return

  const [row] = await db
    .select({ value: count() })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.orgId, req.orgId))

  const current = Number(row?.value ?? 0)
  if (current >= limits.maxWorkspaces) {
    return reply.status(402).send({
      code: 'PLAN_LIMIT',
      message: 'Workspace limit reached',
      limit: limits.maxWorkspaces,
      current,
      plan: org.plan,
    })
  }
}

// §16.3 Pre-action gate — enforced inside the same transaction as the insert
export async function checkAccountLimit(req: FastifyRequest, reply: FastifyReply) {
  if (!req.orgId) return
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, req.orgId),
  })
  if (!org) return

  if (org.planStatus !== 'active') {
    return reply.status(402).send({
      code: 'PLAN_INACTIVE',
      message: 'Plan is not active',
      plan_status: org.planStatus,
    })
  }

  const limits = PLAN_LIMITS[org.plan as OrgPlan]
  const [row] = await db
    .select({ value: count() })
    .from(schema.socialAccounts)
    .where(
      and(
        eq(schema.socialAccounts.orgId, req.orgId),
        eq(schema.socialAccounts.status, 'connected')
      )
    )

  const current = Number(row?.value ?? 0)
  if (current >= limits.maxAccounts) {
    return reply.status(402).send({
      code: 'PLAN_LIMIT',
      message: 'Connected account limit reached',
      limit: limits.maxAccounts,
      current,
      plan: org.plan,
    })
  }
}

export async function checkMemberLimit(req: FastifyRequest, reply: FastifyReply) {
  if (!req.orgId) return
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, req.orgId),
  })
  if (!org) return

  if (org.planStatus !== 'active') {
    return reply.status(402).send({ code: 'PLAN_INACTIVE', plan_status: org.planStatus })
  }

  const limits = PLAN_LIMITS[org.plan as OrgPlan]
  if (limits.maxMembers === null) return

  const [row] = await db
    .select({ value: count() })
    .from(schema.orgMembers)
    .where(
      and(
        eq(schema.orgMembers.orgId, req.orgId),
        eq(schema.orgMembers.status, 'active')
      )
    )

  const current = Number(row?.value ?? 0)
  if (current >= limits.maxMembers) {
    return reply.status(402).send({
      code: 'PLAN_LIMIT',
      message: 'Member limit reached',
      limit: limits.maxMembers,
      current,
      plan: org.plan,
    })
  }
}
