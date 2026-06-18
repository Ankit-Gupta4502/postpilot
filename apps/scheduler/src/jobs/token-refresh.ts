import { db, schema } from '@postpilot/db'
import { eq, lte, and } from 'drizzle-orm'

export async function tokenRefreshJob() {
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const expiring = await db.query.socialAccounts.findMany({
    where: and(
      eq(schema.socialAccounts.status, 'connected'),
      lte(schema.socialAccounts.expiresAt, soon)
    ),
  })
  console.log(`Token refresh: found ${expiring.length} accounts expiring soon`)
  // TODO: Call adapter.refreshToken() for each
}
