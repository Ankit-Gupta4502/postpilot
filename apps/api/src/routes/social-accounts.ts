import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { getAdapter } from '@postpilot/adapters'
import { decrypt } from '../lib/encryption'
import { enqueueMessage } from '../lib/queue'
import { QUEUE_NAMES } from '@postpilot/shared'
import { ok, accepted, fail } from '../lib/response'

export const socialAccountsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { workspaceId: string } }>('/:workspaceId', { preHandler: [requireOrg] }, async (req, reply) => {
    const accounts = await db.query.socialAccounts.findMany({
      where: eq(schema.socialAccounts.workspaceId, req.params.workspaceId),
    })
    return ok(reply, { data: accounts, message: 'Social accounts retrieved' })
  })

  fastify.delete<{ Params: { accountId: string } }>(
    '/:accountId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(schema.socialAccounts.id, req.params.accountId),
          eq(schema.socialAccounts.orgId, req.orgId!)
        ),
      })
      if (!account) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Account not found' })

      if (account.accessToken) {
        const accessToken = decrypt(account.accessToken)
        await getAdapter(account.platform).disconnect({ accessToken }).catch(() => {})
      }

      await db.update(schema.socialAccounts)
        .set({ status: 'revoked', updatedAt: new Date() })
        .where(eq(schema.socialAccounts.id, account.id))

      await db.update(schema.syndicationJobs)
        .set({ status: 'cancelled' })
        .where(and(
          eq(schema.syndicationJobs.socialAccountId, account.id),
          eq(schema.syndicationJobs.status, 'queued')
        ))

      await db.insert(schema.auditLog).values({
        orgId: req.orgId!,
        actorUser: req.userId!,
        action: 'account.disconnect',
        targetType: 'social_account',
        targetId: account.id,
        metadata: JSON.stringify({ platform: account.platform, username: account.username }),
      }).catch(() => {})

      return ok(reply, { data: { disconnected: true }, message: 'Account disconnected' })
    }
  )

  fastify.post<{ Params: { accountId: string } }>(
    '/:accountId/backfill',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(schema.socialAccounts.id, req.params.accountId),
          eq(schema.socialAccounts.orgId, req.orgId!)
        ),
        columns: { id: true, status: true },
      })
      if (!account) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Account not found' })
      if (account.status !== 'connected') {
        return fail(reply, { status: 422, code: 'ACCOUNT_NOT_CONNECTED', message: 'Account is not connected' })
      }

      await enqueueMessage(QUEUE_NAMES.BACKFILL, { socialAccountId: account.id })
      return accepted(reply, { data: { queued: true }, message: 'Backfill queued' })
    }
  )

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
      return ok(reply, { data: { state, platform }, message: 'OAuth state created' })
    }
  )
}
