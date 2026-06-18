import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth.js'

export const socialAccountsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { workspaceId: string } }>('/:workspaceId', { preHandler: [requireOrg] }, async (req, reply) => {
    const accounts = await db.query.socialAccounts.findMany({
      where: eq(schema.socialAccounts.workspaceId, req.params.workspaceId),
    })
    return reply.send(accounts)
  })

  // OAuth initiation
  fastify.post<{ Body: { workspaceId: string; platform: string } }>(
    '/connect',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { workspaceId, platform } = req.body
      const state = crypto.randomUUID()
      await db.insert(schema.oauthStates).values({
        state,
        orgId: req.orgId!,
        workspaceId,
        platform,
        createdBy: req.userId!,
        redirectUri: `${process.env['APP_BASE_URL']}/oauth/${platform}/callback`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      })
      return reply.send({ state, platform })
    }
  )
}
