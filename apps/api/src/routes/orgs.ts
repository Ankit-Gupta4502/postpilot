import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireOrg } from '../middleware/require-auth'
import { toSlug } from '@postpilot/shared'
import { ok, created, noContent, fail } from '../lib/response'

export const orgsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const members = await db.query.orgMembers.findMany({
      where: and(
        eq(schema.orgMembers.userId, req.userId!),
        eq(schema.orgMembers.status, 'active')
      ),
      with: { org: true },
    })
    return ok(reply, { data: members.map((m) => ({ ...m.org, role: m.role })), message: 'Orgs retrieved' })
  })

  fastify.post<{ Body: { name: string } }>('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const { name } = req.body
    const slug = toSlug(name)

    const [org] = await db.transaction(async (tx) => {
      const [newOrg] = await tx.insert(schema.organizations).values({
        name,
        slug,
        ownerUserId: req.userId!,
      }).returning()
      await tx.insert(schema.orgMembers).values({
        orgId: newOrg!.id,
        userId: req.userId!,
        role: 'owner',
        joinedAt: new Date(),
      })
      return [newOrg]
    })

    return created(reply, { data: org, message: 'Organization created' })
  })

  fastify.get<{ Params: { orgId: string } }>('/:orgId', { preHandler: [requireOrg] }, async (req, reply) => {
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, req.params.orgId),
    })
    if (!org) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Organization not found' })
    return ok(reply, { data: org, message: 'Organization retrieved' })
  })

  fastify.get('/members', { preHandler: [requireOrg] }, async (req, reply) => {
    const members = await db.query.orgMembers.findMany({
      where: and(
        eq(schema.orgMembers.orgId, req.orgId!),
        eq(schema.orgMembers.status, 'active')
      ),
      with: { user: true },
    })
    return ok(reply, {
      data: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image },
      })),
      message: 'Members retrieved',
    })
  })

  fastify.delete<{ Params: { userId: string } }>(
    '/members/:userId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      if (!['owner', 'admin'].includes(req.orgRole ?? '')) {
        return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Admin or owner required' })
      }

      const target = await db.query.orgMembers.findFirst({
        where: and(
          eq(schema.orgMembers.orgId, req.orgId!),
          eq(schema.orgMembers.userId, req.params.userId)
        ),
      })
      if (!target) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Member not found' })
      if (target.role === 'owner') {
        return fail(reply, { status: 400, code: 'CANNOT_REMOVE_OWNER', message: 'The org owner cannot be removed' })
      }

      await db.transaction(async (tx) => {
        await tx.update(schema.orgMembers)
          .set({ status: 'suspended' })
          .where(eq(schema.orgMembers.id, target.id))
        await tx.delete(schema.workspaceMembers)
          .where(and(
            eq(schema.workspaceMembers.orgId, req.orgId!),
            eq(schema.workspaceMembers.userId, req.params.userId)
          ))
      })

      return noContent(reply)
    }
  )

  fastify.get('/invites', { preHandler: [requireOrg] }, async (req, reply) => {
    if (!['owner', 'admin'].includes(req.orgRole ?? '')) {
      return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Admin or owner required' })
    }
    const invites = await db.query.orgInvites.findMany({
      where: and(
        eq(schema.orgInvites.orgId, req.orgId!),
        eq(schema.orgInvites.status, 'pending')
      ),
    })
    return ok(reply, { data: invites, message: 'Invites retrieved' })
  })
}
