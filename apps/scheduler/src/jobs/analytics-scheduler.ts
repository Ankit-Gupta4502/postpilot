import { db, schema } from '@postpilot/db'
import { eq } from 'drizzle-orm'
import { ANALYTICS_CADENCE_HOURS } from '@postpilot/shared'

export async function analyticsSchedulerJob() {
  const now = new Date()

  const accounts = await db.query.socialAccounts.findMany({
    where: eq(schema.socialAccounts.status, 'connected'),
  })

  for (const account of accounts) {
    const cadenceHours = ANALYTICS_CADENCE_HOURS[account.analyticsSyncPriority]
    const nextSyncDue = account.lastAnalyticsSyncAt
      ? new Date(account.lastAnalyticsSyncAt.getTime() + cadenceHours * 3600 * 1000)
      : new Date(0)

    if (now >= nextSyncDue) {
      console.log(`Enqueuing analytics sync for ${account.id} (priority: ${account.analyticsSyncPriority})`)
      // TODO: Push to ANALYTICS_QUEUE
    }
  }
}
