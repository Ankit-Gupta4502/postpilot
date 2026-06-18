import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth.js'
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

  fastify.post<{ Body: { workspaceId: string; content: string; accountIds: string[]; scheduledFor?: string; timezone?: string } }>(
    '/',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { workspaceId, content, accountIds, scheduledFor, timezone } = req.body

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
              platform: 'instagram',
              idempotencyKey: generateIdempotencyKey(newPost!.id, accountId),
            })
          }
        }

        return [newPost]
      })

      return reply.status(201).send(post)
    }
  )
}
