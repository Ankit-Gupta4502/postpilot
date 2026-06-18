import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and, inArray, gte, lte, desc } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'

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
      if (!account) return reply.status(404).send({ code: 'NOT_FOUND' })
      if (account.orgId !== req.orgId) return reply.status(403).send({ code: 'FORBIDDEN' })

      const platformPostRows = await db.query.platformPosts.findMany({
        where: eq(schema.platformPosts.socialAccountId, socialAccountId),
        columns: { id: true },
      })
      const platformPostIds = platformPostRows.map((p) => p.id)

      if (platformPostIds.length === 0) {
        return reply.send({ snapshots: [] })
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

      return reply.send({ snapshots })
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
      if (!account) return reply.status(404).send({ code: 'NOT_FOUND' })
      if (account.orgId !== req.orgId) return reply.status(403).send({ code: 'FORBIDDEN' })

      const posts = await db.query.platformPosts.findMany({
        where: eq(schema.platformPosts.socialAccountId, socialAccountId),
        orderBy: [desc(schema.platformPosts.publishedAt)],
        limit: 50,
      })

      return reply.send({ posts })
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
      if (!account) return reply.status(404).send({ code: 'NOT_FOUND' })
      if (account.orgId !== req.orgId) return reply.status(403).send({ code: 'FORBIDDEN' })

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

      return reply.send({
        accountId: account.id,
        platform: account.platform,
        username: account.username,
        analyticsSyncPriority: account.analyticsSyncPriority,
        lastAnalyticsSyncAt: account.lastAnalyticsSyncAt,
        totalPosts: platformPostIds.length,
        latestSnapshot,
      })
    }
  )
}
