/**
 * Advisory KV-based rate limiter per social_account_id.
 * Architecture §12: KV is a soft, fast hint for backoff scheduling.
 * The true limiter is the platform's 429 response — this reduces wasted calls.
 *
 * KV key:   rate_limit:{socialAccountId}
 * KV value: { remaining: number, resetAt: number (unix ms) }
 */

const CF_ACCOUNT_ID = () => process.env['CF_ACCOUNT_ID'] ?? ''
const CF_API_TOKEN = () => process.env['CF_API_TOKEN'] ?? ''
const KV_NAMESPACE_ID = () => process.env['KV_NAMESPACE_ID'] ?? ''

function kvUrl(key: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID()}/storage/kv/namespaces/${KV_NAMESPACE_ID()}/values/${encodeURIComponent(key)}`
}

interface RateLimitEntry {
  remaining: number
  resetAt: number
}

async function readKv(key: string): Promise<string | null> {
  if (!CF_ACCOUNT_ID() || !KV_NAMESPACE_ID()) return null
  const res = await fetch(kvUrl(key), {
    headers: { Authorization: `Bearer ${CF_API_TOKEN()}` },
  })
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.text()
}

async function writeKv(key: string, value: string, ttlSeconds = 3600): Promise<void> {
  if (!CF_ACCOUNT_ID() || !KV_NAMESPACE_ID()) return
  await fetch(`${kvUrl(key)}?expiration_ttl=${ttlSeconds}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN()}`,
      'Content-Type': 'text/plain',
    },
    body: value,
  }).catch(() => {})
}

async function deleteKv(key: string): Promise<void> {
  if (!CF_ACCOUNT_ID() || !KV_NAMESPACE_ID()) return
  await fetch(kvUrl(key), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${CF_API_TOKEN()}` },
  }).catch(() => {})
}

function rateLimitKey(socialAccountId: string): string {
  return `rate_limit:${socialAccountId}`
}

/** Returns true if the account is currently rate-limited (soft check). */
export async function isRateLimited(socialAccountId: string): Promise<boolean> {
  try {
    const raw = await readKv(rateLimitKey(socialAccountId))
    if (!raw) return false
    const entry: RateLimitEntry = JSON.parse(raw)
    if (entry.resetAt < Date.now()) {
      await deleteKv(rateLimitKey(socialAccountId))
      return false
    }
    return entry.remaining <= 0
  } catch {
    return false
  }
}

/**
 * Call this when a platform returns a 429. Records that the account is rate
 * limited until resetAt (defaults to 15 minutes from now if not provided).
 */
export async function recordRateLimit(
  socialAccountId: string,
  resetAtMs?: number
): Promise<void> {
  const resetAt = resetAtMs ?? Date.now() + 15 * 60 * 1000
  const ttl = Math.ceil((resetAt - Date.now()) / 1000) + 60
  const entry: RateLimitEntry = { remaining: 0, resetAt }
  await writeKv(rateLimitKey(socialAccountId), JSON.stringify(entry), ttl)
}

/** Clear the rate limit for an account (e.g. after a successful call). */
export async function clearRateLimit(socialAccountId: string): Promise<void> {
  await deleteKv(rateLimitKey(socialAccountId))
}
