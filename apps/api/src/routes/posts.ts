import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { generateIdempotencyKey } from '@postpilot/shared'
import { ok, created } from '../lib/response'

type PlatformDraft = {
  content: string
  hashtags?: string[]
  note?: string
}

export const postsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { workspaceId: string } }>('/', { preHandler: [requireOrg] }, async (req, reply) => {
    const posts = await db.query.posts.findMany({
      where: and(
        eq(schema.posts.workspaceId, req.query.workspaceId),
        eq(schema.posts.orgId, req.orgId!)
      ),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    })
    return ok(reply, { data: posts, message: 'Posts retrieved' })
  })

  fastify.post<{ Body: { workspaceId: string; content?: string; accountIds: string[]; platformDrafts?: Record<string, PlatformDraft>; scheduledFor?: string; timezone?: string; mediaIds?: string[] } }>(
    '/',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { workspaceId, content = '', accountIds, platformDrafts = {}, scheduledFor, timezone, mediaIds } = req.body

      const accounts = accountIds.length > 0
        ? await db.query.socialAccounts.findMany({
            where: and(
              inArray(schema.socialAccounts.id, accountIds),
              eq(schema.socialAccounts.orgId, req.orgId!)
            ),
          })
        : []
      const platformByAccountId = new Map(accounts.map((a) => [a.id, a.platform]))

      const pickDraft = (platform: string) => {
        const fallback: PlatformDraft = { content }
        return platformDrafts[platform] ?? fallback
      }

      const [post] = await db.transaction(async (tx) => {
        const defaultContent = content || Object.values(platformDrafts)[0]?.content || ''
        const [newPost] = await tx.insert(schema.posts).values({
          orgId: req.orgId!,
          workspaceId,
          createdBy: req.userId!,
          content: defaultContent,
          status: scheduledFor ? 'scheduled' : 'publishing',
          scheduledForUtc: scheduledFor ? new Date(scheduledFor) : null,
          scheduledTimezone: timezone,
        }).returning()

        if (!scheduledFor) {
          for (const accountId of accountIds) {
            const platform = platformByAccountId.get(accountId) ?? 'unknown'
            const draft = pickDraft(platform)
            const hashtags = draft.hashtags ?? []
            const contentWithHashtags = [
              draft.content.trim(),
              hashtags.length > 0 ? hashtags.map((tag) => `#${tag}`).join(' ') : '',
            ].filter(Boolean).join('\n\n')

            await tx.insert(schema.syndicationJobs).values({
              postId: newPost!.id,
              socialAccountId: accountId,
              platform,
              content: contentWithHashtags || draft.content || defaultContent,
              metadata: {
                hashtags,
                note: draft.note ?? '',
              },
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

      return created(reply, { data: post, message: 'Post created' })
    }
  )
}
