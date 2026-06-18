import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { generateIdempotencyKey } from '@postpilot/shared'

export const postsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { workspaceId: string } }>('/', { preHandler: [requireOrg] }, async (req, reply) => {
    const posts = await db.query.posts.findMany({
      where: and(
        eq(schema.posts.workspaceId, req.query.workspaceId),
        eq(schema.posts.orgId, req.orgId!)
      ),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    })
    return reply.send(posts)
  })

  fastify.post<{ Body: { workspaceId: string; content: string; accountIds: string[]; scheduledFor?: string; timezone?: string; mediaIds?: string[] } }>(
    '/',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { workspaceId, content, accountIds, scheduledFor, timezone, mediaIds } = req.body

      // Fetch platforms for the selected accounts (also validates org ownership)
      const accounts = accountIds.length > 0
        ? await db.query.socialAccounts.findMany({
            where: and(
              inArray(schema.socialAccounts.id, accountIds),
              eq(schema.socialAccounts.orgId, req.orgId!)
            ),
          })
        : []
      const platformByAccountId = new Map(accounts.map((a) => [a.id, a.platform]))

      const [post] = await db.transaction(async (tx) => {
        const [newPost] = await tx.insert(schema.posts).values({
          orgId: req.orgId!,
          workspaceId,
          createdBy: req.userId!,
          content,
          status: scheduledFor ? 'scheduled' : 'publishing',
          scheduledForUtc: scheduledFor ? new Date(scheduledFor) : null,
          scheduledTimezone: timezone,
        }).returning()

        if (!scheduledFor) {
          for (const accountId of accountIds) {
            await tx.insert(schema.syndicationJobs).values({
              postId: newPost!.id,
              socialAccountId: accountId,
              platform: platformByAccountId.get(accountId) ?? 'unknown',
              idempotencyKey: generateIdempotencyKey(newPost!.id, accountId),
            })
          }
        }

        if (mediaIds && mediaIds.length > 0) {
          await tx.update(schema.media)
            .set({ postId: newPost!.id })
            .where(and(
              inArray(schema.media.id, mediaIds),
              eq(schema.media.orgId, req.orgId!)
            ))
        }

        return [newPost]
      })

      return reply.status(201).send(post)
    }
  )
}
