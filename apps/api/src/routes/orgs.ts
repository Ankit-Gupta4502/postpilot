import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireOrg } from '../middleware/require-auth.js'
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
}
