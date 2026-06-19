import { QUEUE_NAMES } from '@postpilot/shared'
import { publishHandler } from './handlers/publish'
import { syncPostsHandler } from './handlers/sync-posts'
import { analyticsHandler } from './handlers/analytics'
import { webhookHandler } from './handlers/webhook'
import { backfillHandler } from './handlers/backfill'

const QUEUE_ENDPOINT = process.env['CF_QUEUES_PULL_ENDPOINT']
const VISIBILITY_TIMEOUT_MS = Number(process.env['QUEUE_VISIBILITY_TIMEOUT_MS'] ?? 900000)
const BATCH_SIZE = Number(process.env['QUEUE_PULL_BATCH_SIZE'] ?? 10)

interface QueueMessage {
  id: string
  lease_id: string
  body: unknown
  timestamp_ms: number
  attempts: number
}

const HANDLERS: Record<string, (msg: QueueMessage) => Promise<void>> = {
  [QUEUE_NAMES.PUBLISH]: publishHandler,
  [QUEUE_NAMES.SCHEDULED_PUBLISH]: publishHandler,
  [QUEUE_NAMES.SYNC_POSTS]: syncPostsHandler,
  [QUEUE_NAMES.ANALYTICS]: analyticsHandler,
  [QUEUE_NAMES.WEBHOOK]: webhookHandler,
  [QUEUE_NAMES.BACKFILL]: backfillHandler,
}

async function pullMessages(queueId: string): Promise<QueueMessage[]> {
  const res = await fetch(`${QUEUE_ENDPOINT!}/${queueId}/messages/pull`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env['CF_API_TOKEN']}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      visibility_timeout_ms: VISIBILITY_TIMEOUT_MS,
      batch_size: BATCH_SIZE,
    }),
  })
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`)
  const data = await res.json() as { result: { messages: QueueMessage[] } }
  return data.result.messages ?? []
}

async function ackMessages(queueId: string, leaseIds: string[], retryLeaseIds: string[] = []) {
  await fetch(`${QUEUE_ENDPOINT}/${queueId}/messages/ack`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env['CF_API_TOKEN']}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      acks: leaseIds.map((id) => ({ lease_id: id })),
      retries: retryLeaseIds.map((id) => ({ lease_id: id })),
    }),
  })
}

export async function runWorker() {
  if (!QUEUE_ENDPOINT || !process.env['CF_API_TOKEN']) {
    console.log('CF_QUEUES_PULL_ENDPOINT or CF_API_TOKEN not configured — queue worker exiting.')
    return
  }

  const queues = Object.keys(HANDLERS)
  console.log(`Watching queues: ${queues.join(', ')}`)

  while (true) {
    for (const queueName of queues) {
      const queueId = process.env[`CF_QUEUE_ID_${queueName.toUpperCase()}`] ?? queueName
      try {
        const messages = await pullMessages(queueId)
        if (messages.length === 0) continue

        const acks: string[] = []
        const retries: string[] = []

        await Promise.allSettled(
          messages.map(async (msg) => {
            const handler = HANDLERS[queueName]
            if (!handler) { acks.push(msg.lease_id); return }
            try {
              await handler(msg)
              acks.push(msg.lease_id)
            } catch (err) {
              console.error(`Handler error for ${queueName}:`, err)
              retries.push(msg.lease_id)
            }
          })
        )

        if (acks.length > 0 || retries.length > 0) {
          await ackMessages(queueId, acks, retries)
        }
      } catch (err) {
        console.error(`Queue pull error for ${queueName}:`, err)
      }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}
