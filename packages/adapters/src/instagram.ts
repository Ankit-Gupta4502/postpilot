import crypto from 'node:crypto'
import type {
  PlatformAdapter,
  ConnectResult,
  RefreshResult,
  PublishInput,
  PublishResult,
  SyncPostsResult,
  AnalyticsSnapshot,
  WebhookEvent,
} from './base'

const GRAPH_API = 'https://graph.facebook.com/v19.0'

/**
 * Instagram adapter — uses the Instagram Graph API via a Facebook App.
 * Access tokens for Instagram are long-lived (60 days); refresh exchanges
 * a long-lived token for a new one.
 */
export class InstagramAdapter implements PlatformAdapter {
  private readonly clientId = process.env['INSTAGRAM_CLIENT_ID']!
  private readonly clientSecret = process.env['INSTAGRAM_CLIENT_SECRET']!
  private readonly appSecret = process.env['META_APP_SECRET']!

  async connect(code: string, redirectUri: string): Promise<ConnectResult> {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(`${GRAPH_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })
    if (!tokenRes.ok) {
      const err = await tokenRes.json() as { error?: { message?: string } }
      throw new Error(`Instagram token exchange failed: ${err.error?.message ?? tokenRes.status}`)
    }
    const { access_token: shortToken } = await tokenRes.json() as { access_token: string }

    // 2. Exchange for long-lived token (valid 60 days)
    const longRes = await fetch(
      `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.clientId}&client_secret=${this.clientSecret}&fb_exchange_token=${shortToken}`
    )
    if (!longRes.ok) throw new Error('Failed to exchange for long-lived Instagram token')
    const { access_token: accessToken, expires_in } = await longRes.json() as {
      access_token: string
      expires_in: number
    }

    // 3. Fetch the Instagram business/creator account linked to this user
    const meRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=instagram_business_account,name,access_token&access_token=${accessToken}`
    )
    const meData = await meRes.json() as { data?: Array<{ instagram_business_account?: { id: string }; name: string; access_token: string }> }
    const page = meData.data?.[0]
    const igAccountId = page?.instagram_business_account?.id
    if (!igAccountId) throw new Error('No Instagram Business/Creator account linked to this Facebook user')

    // 4. Fetch IG account details
    const igRes = await fetch(
      `${GRAPH_API}/${igAccountId}?fields=username,name,profile_picture_url&access_token=${accessToken}`
    )
    const ig = await igRes.json() as { username?: string; name?: string; profile_picture_url?: string }

    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined

    return {
      accessToken,
      platformAccountId: igAccountId,
      username: ig.username,
      displayName: ig.name,
      avatarUrl: ig.profile_picture_url,
      expiresAt,
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
    }
  }

  async refreshToken(account: { accessToken: string }): Promise<RefreshResult> {
    const res = await fetch(
      `${GRAPH_API}/oauth/access_token?grant_type=ig_refresh_token&access_token=${account.accessToken}`
    )
    if (!res.ok) throw new Error('Instagram token refresh failed')
    const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number }
    return {
      accessToken: access_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    }
  }

  async publish(input: PublishInput, _idempotencyKey: string, account: { accessToken: string; platformAccountId?: string }): Promise<PublishResult> {
    const igAccountId = account.platformAccountId
    if (!igAccountId) throw new Error('platformAccountId required for Instagram publish')

    // 1. Create a media container
    const containerBody: Record<string, string> = {
      caption: input.content,
      access_token: account.accessToken,
    }

    if (input.mediaUrls?.[0]) {
      // Single image post
      containerBody['image_url'] = input.mediaUrls[0]
      containerBody['media_type'] = 'IMAGE'
    } else {
      // Text/Reel — Instagram requires media; fall back to story or error
      throw new Error('Instagram requires at least one media URL')
    }

    const containerRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(containerBody),
    })
    if (!containerRes.ok) {
      const err = await containerRes.json() as { error?: { message?: string } }
      throw new Error(`Instagram container creation failed: ${err.error?.message}`)
    }
    const { id: creationId } = await containerRes.json() as { id: string }

    // 2. Publish the container
    const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: account.accessToken,
      }),
    })
    if (!publishRes.ok) {
      const err = await publishRes.json() as { error?: { message?: string } }
      throw new Error(`Instagram publish failed: ${err.error?.message}`)
    }
    const { id: platformPostId } = await publishRes.json() as { id: string }
    return { platformPostId, url: `https://www.instagram.com/p/${platformPostId}/` }
  }

  async syncPosts(
    account: { accessToken: string; platformAccountId: string },
    checkpoint?: string | null
  ): Promise<SyncPostsResult> {
    let url = `${GRAPH_API}/${account.platformAccountId}/media?fields=id,caption,timestamp,like_count,comments_count&limit=20&access_token=${account.accessToken}`
    if (checkpoint) url += `&after=${checkpoint}`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Instagram syncPosts failed: ${res.status}`)
    const data = await res.json() as {
      data: Array<{ id: string; caption?: string; timestamp?: string; like_count?: number; comments_count?: number }>
      paging?: { cursors?: { after?: string } }
    }

    return {
      posts: data.data.map((p) => ({
        platformPostId: p.id,
        content: p.caption,
        publishedAt: p.timestamp ? new Date(p.timestamp) : undefined,
        likeCount: p.like_count,
        commentCount: p.comments_count,
      })),
      nextCheckpoint: data.paging?.cursors?.after ?? null,
    }
  }

  async syncAnalytics(account: { accessToken: string }, platformPostId: string): Promise<AnalyticsSnapshot> {
    const res = await fetch(
      `${GRAPH_API}/${platformPostId}/insights?metric=impressions,reach,likes,comments,shares&access_token=${account.accessToken}`
    )
    if (!res.ok) return {}
    const data = await res.json() as { data: Array<{ name: string; values: Array<{ value: number }> }> }
    const m: Record<string, number> = {}
    for (const metric of data.data) {
      m[metric.name] = metric.values[0]?.value ?? 0
    }
    return {
      likes: m['likes'],
      comments: m['comments'],
      shares: m['shares'],
      views: m['impressions'],
      reach: m['reach'],
    }
  }

  async disconnect(account: { accessToken: string }): Promise<void> {
    // Best-effort token revocation
    await fetch(`${GRAPH_API}/me/permissions?access_token=${account.accessToken}`, {
      method: 'DELETE',
    }).catch(() => {})
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    // Meta sends X-Hub-Signature-256: sha256=<hmac>
    const expected = `sha256=${crypto.createHmac('sha256', this.appSecret).update(rawBody).digest('hex')}`
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }

  async handleWebhook(payload: unknown): Promise<WebhookEvent> {
    const body = payload as { object?: string; entry?: unknown[] }
    return { type: `meta.${body.object ?? 'unknown'}`, data: body }
  }
}
