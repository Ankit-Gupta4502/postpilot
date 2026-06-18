import { db, schema } from '@postpilot/db'
import { eq } from 'drizzle-orm'
import { getAdapter } from '@postpilot/adapters'
import { decrypt } from '@postpilot/shared'

export async function analyticsHandler(msg: { body: unknown }) {
  const { socialAccountId } = msg.body as { socialAccountId: string }

  const account = await db.query.socialAccounts.findFirst({
    where: eq(schema.socialAccounts.id, socialAccountId),
  })
  if (!account || account.status !== 'connected') return

  const accessToken = account.accessToken ? decrypt(account.accessToken) : ''
  const adapter = getAdapter(account.platform)

  const posts = await db.query.platformPosts.findMany({
    where: eq(schema.platformPosts.socialAccountId, socialAccountId),
    limit: 100,
    orderBy: (t, { desc }) => [desc(t.publishedAt)],
  })

  let failed = 0
  for (const post of posts) {
    try {
      const snapshot = await adapter.syncAnalytics({ accessToken }, post.platformPostId)

      await db.insert(schema.postMetricSnapshots).values({
        platformPostId: post.id,
        likes: snapshot.likes ?? null,
        comments: snapshot.comments ?? null,
        shares: snapshot.shares ?? null,
        views: snapshot.views ?? null,
        reach: snapshot.reach ?? null,
        capturedAt: new Date(),
      })

      await db.update(schema.platformPosts).set({
        likesCount: snapshot.likes ?? post.likesCount,
        commentsCount: snapshot.comments ?? post.commentsCount,
        sharesCount: snapshot.shares ?? post.sharesCount,
        viewsCount: snapshot.views ?? post.viewsCount,
        reach: snapshot.reach ?? post.reach,
        updatedAt: new Date(),
      }).where(eq(schema.platformPosts.id, post.id))
    } catch (err) {
      console.error(`Analytics sync failed for post ${post.platformPostId}:`, err)
      failed++
    }
  }

  await db.update(schema.socialAccounts).set({
    lastAnalyticsSyncAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(schema.socialAccounts.id, socialAccountId))

  if (failed > 0 && failed === posts.length) {
    throw new Error(`Analytics sync failed for all ${failed} posts on account ${socialAccountId}`)
  }
}
