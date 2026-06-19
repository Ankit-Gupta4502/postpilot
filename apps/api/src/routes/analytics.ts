import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and, inArray, gte, lte, desc } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { ok, fail } from '../lib/response'

export const analyticsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Params: { socialAccountId: string }
    Querystring: { from?: string; to?: string; limit?: number }
  }>(
    '/:socialAccountId/snapshots',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { socialAccountId } = req.params
      const { from, to, limit } = req.query

      const account = await db.query.socialAccounts.findFirst({
        where: eq(schema.socialAccounts.id, socialAccountId),
      })
      if (!account) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Account not found' })
      if (account.orgId !== req.orgId) return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Access denied' })

      const platformPostRows = await db.query.platformPosts.findMany({
        where: eq(schema.platformPosts.socialAccountId, socialAccountId),
        columns: { id: true },
      })
      const platformPostIds = platformPostRows.map((p) => p.id)

      if (platformPostIds.length === 0) {
        return ok(reply, { data: { snapshots: [] }, message: 'Snapshots retrieved' })
      }

      const conditions = [inArray(schema.postMetricSnapshots.platformPostId, platformPostIds)]
      if (from) conditions.push(gte(schema.postMetricSnapshots.capturedAt, new Date(from)))
      if (to) conditions.push(lte(schema.postMetricSnapshots.capturedAt, new Date(to)))

      const snapshots = await db.query.postMetricSnapshots.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.postMetricSnapshots.capturedAt)],
        limit: limit ? Number(limit) : 100,
        columns: {
          id: true,
          platformPostId: true,
          likes: true,
          comments: true,
          shares: true,
          views: true,
          reach: true,
          capturedAt: true,
        },
      })

      return ok(reply, { data: { snapshots }, message: 'Snapshots retrieved' })
    }
  )

  fastify.get<{ Params: { socialAccountId: string } }>(
    '/:socialAccountId/posts',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { socialAccountId } = req.params

      const account = await db.query.socialAccounts.findFirst({
        where: eq(schema.socialAccounts.id, socialAccountId),
      })
      if (!account) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Account not found' })
      if (account.orgId !== req.orgId) return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Access denied' })

      const posts = await db.query.platformPosts.findMany({
        where: eq(schema.platformPosts.socialAccountId, socialAccountId),
        orderBy: [desc(schema.platformPosts.publishedAt)],
        limit: 50,
      })

      return ok(reply, { data: { posts }, message: 'Posts retrieved' })
    }
  )

  fastify.get<{ Params: { socialAccountId: string } }>(
    '/:socialAccountId/summary',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { socialAccountId } = req.params

      const account = await db.query.socialAccounts.findFirst({
        where: eq(schema.socialAccounts.id, socialAccountId),
      })
      if (!account) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Account not found' })
      if (account.orgId !== req.orgId) return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Access denied' })

      const platformPostRows = await db.query.platformPosts.findMany({
        where: eq(schema.platformPosts.socialAccountId, socialAccountId),
        columns: { id: true },
      })
      const platformPostIds = platformPostRows.map((p) => p.id)

      let latestSnapshot = null
      if (platformPostIds.length > 0) {
        latestSnapshot = await db.query.postMetricSnapshots.findFirst({
          where: inArray(schema.postMetricSnapshots.platformPostId, platformPostIds),
          orderBy: [desc(schema.postMetricSnapshots.capturedAt)],
          columns: {
            id: true,
            platformPostId: true,
            likes: true,
            comments: true,
            shares: true,
            views: true,
            reach: true,
            capturedAt: true,
          },
        })
      }

      return ok(reply, {
        data: {
          accountId: account.id,
          platform: account.platform,
          username: account.username,
          analyticsSyncPriority: account.analyticsSyncPriority,
          lastAnalyticsSyncAt: account.lastAnalyticsSyncAt,
          totalPosts: platformPostIds.length,
          latestSnapshot,
        },
        message: 'Summary retrieved',
      })
    }
  )
}
