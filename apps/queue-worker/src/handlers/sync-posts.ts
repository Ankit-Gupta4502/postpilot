import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { getAdapter } from '@postpilot/adapters'
import { decrypt } from '@postpilot/shared'

export async function syncPostsHandler(msg: { body: unknown }) {
  const { socialAccountId } = msg.body as { socialAccountId: string }

  const account = await db.query.socialAccounts.findFirst({
    where: eq(schema.socialAccounts.id, socialAccountId),
  })
  if (!account || account.status !== 'connected') return

  const accessToken = account.accessToken ? decrypt(account.accessToken) : ''

  const state = await db.query.syncState.findFirst({
    where: and(
      eq(schema.syncState.socialAccountId, socialAccountId),
      eq(schema.syncState.syncType, 'posts')
    ),
  })

  const adapter = getAdapter(account.platform)

  let result
  try {
    result = await adapter.syncPosts(
      { accessToken, platformAccountId: account.platformAccountId },
      state?.checkpointValue ?? null
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db.update(schema.socialAccounts).set({
      healthStatus: 'broken',
      lastErrorAt: new Date(),
      lastErrorMessage: message,
      updatedAt: new Date(),
    }).where(eq(schema.socialAccounts.id, socialAccountId))
    throw err
  }

  for (const post of result.posts) {
    await db.insert(schema.platformPosts).values({
      socialAccountId,
      platformPostId: post.platformPostId,
      content: post.content ?? null,
      publishedAt: post.publishedAt ?? null,
      likesCount: post.likeCount ?? 0,
      commentsCount: post.commentCount ?? 0,
      sharesCount: post.shareCount ?? 0,
      viewsCount: post.viewCount ?? 0,
      reach: post.reachCount ?? 0,
      isOurs: false,
    }).onConflictDoUpdate({
      target: [schema.platformPosts.socialAccountId, schema.platformPosts.platformPostId],
      set: {
        content: post.content ?? null,
        publishedAt: post.publishedAt ?? null,
        likesCount: post.likeCount ?? 0,
        commentsCount: post.commentCount ?? 0,
        sharesCount: post.shareCount ?? 0,
        viewsCount: post.viewCount ?? 0,
        reach: post.reachCount ?? 0,
        updatedAt: new Date(),
      },
    })
  }

  await db.insert(schema.syncState).values({
    socialAccountId,
    syncType: 'posts',
    checkpointType: 'cursor',
    checkpointValue: result.nextCheckpoint ?? null,
    lastSyncAt: new Date(),
  }).onConflictDoUpdate({
    target: [schema.syncState.socialAccountId, schema.syncState.syncType],
    set: {
      checkpointValue: result.nextCheckpoint ?? null,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await db.update(schema.socialAccounts).set({
    lastPostSyncAt: new Date(),
    healthStatus: 'healthy',
    updatedAt: new Date(),
  }).where(eq(schema.socialAccounts.id, socialAccountId))
}
