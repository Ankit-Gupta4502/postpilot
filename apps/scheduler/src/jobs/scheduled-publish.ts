import { db, schema } from '@postpilot/db'
import { eq, lte, and } from 'drizzle-orm'
import { QUEUE_NAMES } from '@postpilot/shared'

export async function scheduledPublishJob() {
  const now = new Date()
  const duePosts = await db.query.posts.findMany({
    where: and(
      eq(schema.posts.status, 'scheduled'),
      lte(schema.posts.scheduledForUtc, now)
    ),
    with: { syndicationJobs: true },
  })

  for (const post of duePosts) {
    console.log(`Enqueuing scheduled post ${post.id}`)
    await db.update(schema.posts).set({ status: 'publishing' }).where(eq(schema.posts.id, post.id))
    // TODO: Push to SCHEDULED_PUBLISH_QUEUE via CF API
  }
}
