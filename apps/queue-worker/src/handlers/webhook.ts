import { db, schema } from '@postpilot/db'
import { eq } from 'drizzle-orm'
import { getAdapter } from '@postpilot/adapters'

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
      // TODO: process post/comment notifications — parse entry array, trigger sync
      console.log(`Meta webhook received: ${evt.type}`, JSON.stringify(evt.data).slice(0, 200))
      break
    }

    default:
      console.log(`Unhandled webhook type: ${evt.type}`)
  }
}
