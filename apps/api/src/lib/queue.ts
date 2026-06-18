/**
 * Cloudflare Queues HTTP Push client.
 * Used by the API to enqueue background jobs.
 * The queue-worker process pulls and processes messages separately.
 */

const CF_ACCOUNT_ID = () => process.env['CF_ACCOUNT_ID'] ?? ''
const CF_API_TOKEN = () => process.env['CF_API_TOKEN'] ?? ''

/** Maps our queue name constants to CF queue IDs (or falls back to the name itself). */
function queueId(queueName: string): string {
  const envKey = `CF_QUEUE_ID_${queueName.toUpperCase()}`
  return process.env[envKey] ?? queueName
}

/**
 * Enqueue a single message to a Cloudflare Queue.
 * Throws on HTTP errors so callers can bubble up or retry.
 */
export async function enqueueMessage(queueName: string, body: unknown): Promise<void> {
  const id = queueId(queueName)
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID()}/queues/${id}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)')
    throw new Error(`CF queue enqueue failed [${queueName}] status=${res.status}: ${text}`)
  }
}

/**
 * Enqueue multiple messages in a single batch request.
 * CF supports up to 100 messages per batch.
 */
export async function enqueueBatch(queueName: string, bodies: unknown[]): Promise<void> {
  if (bodies.length === 0) return
  const id = queueId(queueName)
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID()}/queues/${id}/messages/batch`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: bodies.map((body) => ({ body })) }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)')
    throw new Error(`CF queue batch enqueue failed [${queueName}] status=${res.status}: ${text}`)
  }
}
