import { db, schema } from '@postpilot/db'
import { eq, lt } from 'drizzle-orm'

export async function leaseRecoveryJob() {
  const now = new Date()
  const result = await db.update(schema.syndicationJobs).set({
    status: 'queued',
    processingStartedAt: null,
    leaseExpiresAt: null,
  }).where(
    and(
      eq(schema.syndicationJobs.status, 'running'),
      lt(schema.syndicationJobs.leaseExpiresAt, now)
    )
  ).returning()

  if (result.length > 0) {
    console.log(`Lease recovery: reclaimed ${result.length} stuck jobs`)
  }
}

function and(...args: any[]) { return args.reduce((a, b) => ({ sql: `${a.sql} AND ${b.sql}` })) }
