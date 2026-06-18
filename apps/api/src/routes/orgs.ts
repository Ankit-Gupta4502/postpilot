import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireOrg } from '../middleware/require-auth'
import { toSlug } from '@postpilot/shared'

export const orgsRouter: FastifyPluginAsync = async (fastify) => {
  // List orgs for current user
  fastify.get('/', { preHandler: [requireAuth] }, async (req, reply) => {
    const members = await db.query.orgMembers.findMany({
      where: and(
        eq(schema.orgMembers.userId, req.userId!),
        eq(schema.orgMembers.status, 'active')
      ),
      with: { org: true },
    })
    return reply.send(members.map((m) => ({ ...m.org, role: m.role })))
  })

  // Create org
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

    return reply.status(201).send(org)
  })

  // Get org
  fastify.get<{ Params: { orgId: string } }>('/:orgId', { preHandler: [requireOrg] }, async (req, reply) => {
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, req.params.orgId),
    })
    if (!org) return reply.status(404).send({ code: 'NOT_FOUND', message: 'Organization not found' })
    return reply.send(org)
  })

  // List org members
  fastify.get('/members', { preHandler: [requireOrg] }, async (req, reply) => {
    const members = await db.query.orgMembers.findMany({
      where: and(
        eq(schema.orgMembers.orgId, req.orgId!),
        eq(schema.orgMembers.status, 'active')
      ),
      with: { user: true },
    })
    return reply.send(
      members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image },
      }))
    )
  })

  // Remove org member (admin/owner only; cannot remove owner)
  fastify.delete<{ Params: { userId: string } }>(
    '/members/:userId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      if (!['owner', 'admin'].includes(req.orgRole ?? '')) {
        return reply.status(403).send({ code: 'FORBIDDEN' })
      }

      const target = await db.query.orgMembers.findFirst({
        where: and(
          eq(schema.orgMembers.orgId, req.orgId!),
          eq(schema.orgMembers.userId, req.params.userId)
        ),
      })
      if (!target) return reply.status(404).send({ code: 'NOT_FOUND' })
      if (target.role === 'owner') {
        return reply.status(400).send({ code: 'CANNOT_REMOVE_OWNER', message: 'The org owner cannot be removed' })
      }

      await db.transaction(async (tx) => {
        await tx.update(schema.orgMembers)
          .set({ status: 'suspended' })
          .where(eq(schema.orgMembers.id, target.id))
        // Remove from all workspaces in this org
        await tx.delete(schema.workspaceMembers)
          .where(and(
            eq(schema.workspaceMembers.orgId, req.orgId!),
            eq(schema.workspaceMembers.userId, req.params.userId)
          ))
      })

      return reply.status(204).send()
    }
  )

  // List pending invites for this org
  fastify.get('/invites', { preHandler: [requireOrg] }, async (req, reply) => {
    if (!['owner', 'admin'].includes(req.orgRole ?? '')) {
      return reply.status(403).send({ code: 'FORBIDDEN' })
    }
    const invites = await db.query.orgInvites.findMany({
      where: and(
        eq(schema.orgInvites.orgId, req.orgId!),
        eq(schema.orgInvites.status, 'pending')
      ),
    })
    return reply.send(invites)
  })
}
