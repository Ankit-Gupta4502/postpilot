import { db, schema } from '@postpilot/db'
import { eq } from 'drizzle-orm'

export async function analyticsHandler(msg: { body: unknown }) {
  const payload = msg.body as { socialAccountId: string }
  console.log(`Syncing analytics for account ${payload.socialAccountId}`)
  // TODO: Call platform adapter syncAnalytics(), insert post_metric_snapshots
}
