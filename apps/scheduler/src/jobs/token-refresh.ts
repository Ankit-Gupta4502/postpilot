import { db, schema } from '@postpilot/db'
import { eq, lte, and } from 'drizzle-orm'
import { getAdapter } from '@postpilot/adapters'
import { decrypt, encrypt } from '@postpilot/shared'

export async function tokenRefreshJob() {
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const expiring = await db.query.socialAccounts.findMany({
    where: and(
      eq(schema.socialAccounts.status, 'connected'),
      lte(schema.socialAccounts.expiresAt, soon)
    ),
  })
  console.log(`Token refresh: found ${expiring.length} accounts expiring soon`)

  let refreshed = 0
  let failed = 0

  for (const account of expiring) {
    try {
      const accessToken = account.accessToken ? decrypt(account.accessToken) : ''
      const refreshToken = account.refreshToken ? decrypt(account.refreshToken) : undefined

      const adapter = getAdapter(account.platform)
      const result = await adapter.refreshToken({
        accessToken,
        refreshToken,
        platformAccountId: account.platformAccountId,
      })

      await db.update(schema.socialAccounts).set({
        accessToken: encrypt(result.accessToken),
        refreshToken: result.refreshToken ? encrypt(result.refreshToken) : account.refreshToken,
        expiresAt: result.expiresAt ?? null,
        status: 'connected',
        healthStatus: 'healthy',
        updatedAt: new Date(),
      }).where(eq(schema.socialAccounts.id, account.id))

      refreshed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      await db.update(schema.socialAccounts).set({
        healthStatus: 'broken',
        status: 'expired',
        lastErrorAt: new Date(),
        lastErrorMessage: message,
        updatedAt: new Date(),
      }).where(eq(schema.socialAccounts.id, account.id))

      await db.insert(schema.auditLog).values({
        orgId: account.orgId,
        action: 'social_account.token_refresh_failed',
        targetType: 'social_account',
        targetId: account.id,
        metadata: JSON.stringify({ platform: account.platform, error: message }),
      }).catch(() => {})

      console.error(`Token refresh failed for account ${account.id} (${account.platform}):`, err)
      failed++
    }
  }

  console.log(`Token refresh: ${refreshed} refreshed, ${failed} failed`)
}
