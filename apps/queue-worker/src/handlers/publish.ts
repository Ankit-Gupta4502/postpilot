import { db, schema } from '@postpilot/db'
import { eq } from 'drizzle-orm'
import { getAdapter } from '@postpilot/adapters'
import { decrypt } from '@postpilot/shared'

export async function publishHandler(msg: { body: unknown }) {
  const payload = msg.body as { syndicationJobId: string }
  const { syndicationJobId } = payload

  const job = await db.query.syndicationJobs.findFirst({
    where: eq(schema.syndicationJobs.id, syndicationJobId),
    with: { post: true, socialAccount: true },
  })

  if (!job) throw new Error(`Job ${syndicationJobId} not found`)

  // §5.5 — already succeeded, just ACK
  if (job.status === 'success') return

  // §5.5 — reconcile crash: published_post_id set but status not updated
  if (job.publishedPostId) {
    await db.update(schema.syndicationJobs)
      .set({ status: 'success', completedAt: new Date(), leaseExpiresAt: null })
      .where(eq(schema.syndicationJobs.id, syndicationJobId))
    return
  }

  // Acquire lease (§24)
  await db.update(schema.syndicationJobs).set({
    status: 'running',
    processingStartedAt: new Date(),
    leaseExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    attempts: job.attempts + 1,
  }).where(eq(schema.syndicationJobs.id, syndicationJobId))

  const account = job.socialAccount
  if (!account) throw new Error(`No social account for job ${syndicationJobId}`)

  // Decrypt token (§11)
  const accessToken = account.accessToken ? decrypt(account.accessToken) : ''

  // Gate: all media must be ready before publishing
  const mediaRows = job.post?.id
    ? await db.query.media.findMany({ where: eq(schema.media.postId, job.post.id) })
    : []

  const unready = mediaRows.filter((m) => m.status !== 'ready')
  if (unready.length > 0) {
    await db.update(schema.syndicationJobs).set({
      status: 'queued',
      processingStartedAt: null,
      leaseExpiresAt: null,
    }).where(eq(schema.syndicationJobs.id, syndicationJobId))
    throw new Error(`Waiting on ${unready.length} media item(s) to be ready`)
  }

  const mediaUrls = mediaRows.map(
    (m) => `${process.env['R2_PUBLIC_BASE_URL'] ?? ''}/${m.r2Key}`
  )

  const adapter = getAdapter(job.platform)
  const result = await adapter.publish(
    { content: job.post?.content ?? '', mediaUrls },
    job.idempotencyKey,
    { accessToken, platformAccountId: account.platformAccountId }
  )

  // §21 — persist published_post_id AND upsert platform_posts BEFORE acking
  await db.transaction(async (tx) => {
    await tx.update(schema.syndicationJobs).set({
      status: 'success',
      publishedPostId: result.platformPostId,
      completedAt: new Date(),
      leaseExpiresAt: null,
    }).where(eq(schema.syndicationJobs.id, syndicationJobId))

    await tx.insert(schema.platformPosts).values({
      socialAccountId: job.socialAccountId,
      platformPostId: result.platformPostId,
      content: job.post?.content,
      publishedAt: new Date(),
      isOurs: true,
    }).onConflictDoNothing()
  })
}
