import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { getAdapter } from '@postpilot/adapters'
import { syncPostsHandler } from './sync-posts'

export async function webhookHandler(msg: { body: unknown }) {
  const payload = msg.body as {
    platform: string
    rawBody: string
    signature: string
    event: unknown
  }

  const adapter = getAdapter(payload.platform)

  if (!adapter.verifyWebhook(payload.rawBody, payload.signature)) {
    console.warn(`Webhook signature verification failed for platform ${payload.platform}`)
    return
  }

  const evt = await adapter.handleWebhook(payload.event)

  switch (evt.type) {
    case 'media.ready': {
      const data = evt.data as { mediaId?: string }
      if (!data.mediaId) break
      await db.update(schema.media)
        .set({ status: 'ready' })
        .where(eq(schema.media.id, data.mediaId))
      break
    }

    case 'meta.instagram':
    case 'meta.facebook': {
      const metaBody = evt.data as {
        object?: string
        entry?: Array<{ id?: string; changes?: Array<{ field: string; value: unknown }> }>
      }
      const platform = metaBody.object === 'page' ? 'facebook' : 'instagram'
      const entries = metaBody.entry ?? []

      for (const entry of entries) {
        if (!entry.id) continue

        const account = await db.query.socialAccounts.findFirst({
          where: and(
            eq(schema.socialAccounts.platformAccountId, entry.id),
            eq(schema.socialAccounts.platform, platform),
            eq(schema.socialAccounts.status, 'connected'),
          ),
          columns: { id: true },
        })

        if (!account) {
          console.log(`No connected ${platform} account found for platform id ${entry.id}`)
          continue
        }

        console.log(`Meta webhook: triggering sync for ${platform} account ${account.id}`)
        await syncPostsHandler({ body: { socialAccountId: account.id } })
      }
      break
    }

    default:
      console.log(`Unhandled webhook type: ${evt.type}`)
  }
}
