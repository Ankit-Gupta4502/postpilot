import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth.js'

export const workspacesRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [requireOrg] }, async (req, reply) => {
    const members = await db.query.workspaceMembers.findMany({
      where: and(
        eq(schema.workspaceMembers.orgId, req.orgId!),
        eq(schema.workspaceMembers.userId, req.userId!)
      ),
      with: { workspace: true },
    })
    return reply.send(members.map((m) => ({ ...m.workspace, role: m.role })))
  })

  fastify.post<{ Body: { name: string } }>('/', { preHandler: [requireOrg] }, async (req, reply) => {
    const { name } = req.body
    const [workspace] = await db.insert(schema.workspaces).values({
      orgId: req.orgId!,
      name,
      createdBy: req.userId!,
    }).returning()
    return reply.status(201).send(workspace)
  })
}
