import { db, schema } from '@postpilot/db'
import { eq, and, lt } from 'drizzle-orm'

export async function publishHandler(msg: { body: unknown }) {
  const payload = msg.body as { syndicationJobId: string }
  const { syndicationJobId } = payload

  const job = await db.query.syndicationJobs.findFirst({
    where: eq(schema.syndicationJobs.id, syndicationJobId),
    with: { post: true, socialAccount: true },
  })

  if (!job) throw new Error(`Job ${syndicationJobId} not found`)
  if (job.status === 'success') return
  if (job.publishedPostId) {
    await db.update(schema.syndicationJobs)
      .set({ status: 'success', completedAt: new Date() })
      .where(eq(schema.syndicationJobs.id, syndicationJobId))
    return
  }

  await db.update(schema.syndicationJobs).set({
    status: 'running',
    processingStartedAt: new Date(),
    leaseExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    attempts: job.attempts + 1,
  }).where(eq(schema.syndicationJobs.id, syndicationJobId))

  // TODO: Call platform adapter
  // const adapter = getPlatformAdapter(job.platform)
  // const result = await adapter.publish(job.post, job.idempotencyKey)
  // Stub: simulate success
  const platformPostId = `stub_${Date.now()}`

  await db.transaction(async (tx) => {
    await tx.update(schema.syndicationJobs).set({
      status: 'success',
      publishedPostId: platformPostId,
      completedAt: new Date(),
      leaseExpiresAt: null,
    }).where(eq(schema.syndicationJobs.id, syndicationJobId))

    await tx.insert(schema.platformPosts).values({
      socialAccountId: job.socialAccountId,
      platformPostId,
      content: job.post?.content,
      publishedAt: new Date(),
      isOurs: true,
    }).onConflictDoNothing()
  })
}
