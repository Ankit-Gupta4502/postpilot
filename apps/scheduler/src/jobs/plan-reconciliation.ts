import { db, schema } from '@postpilot/db'
import { eq, and, lte, ne } from 'drizzle-orm'

export async function planReconciliationJob() {
  const now = new Date()

  // past_due + grace elapsed → expire
  const pastDueOrgs = await db.query.organizations.findMany({
    where: and(
      eq(schema.organizations.planStatus, 'past_due'),
      lte(schema.organizations.graceUntil, now)
    ),
  })

  for (const org of pastDueOrgs) {
    console.log(`Expiring org ${org.id} (past_due grace elapsed)`)
    await db.update(schema.organizations).set({
      plan: 'free',
      planStatus: 'expired',
      planCheckedAt: now,
    }).where(eq(schema.organizations.id, org.id))
  }

  console.log(`Plan reconciliation complete. Expired ${pastDueOrgs.length} orgs.`)
}
