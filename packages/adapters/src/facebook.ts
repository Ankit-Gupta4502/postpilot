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

export class FacebookAdapter implements PlatformAdapter {
  private readonly appId = process.env['FACEBOOK_APP_ID']!
  private readonly appSecret = process.env['FACEBOOK_APP_SECRET']!

  async connect(code: string, redirectUri: string): Promise<ConnectResult> {
    // 1. Exchange code for short-lived user token
    const tokenRes = await fetch(
      `${GRAPH_API}/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    )
    if (!tokenRes.ok) throw new Error(`Facebook token exchange failed: ${tokenRes.status}`)
    const { access_token: shortToken } = await tokenRes.json() as { access_token: string }

    // 2. Exchange for long-lived user token
    const longRes = await fetch(
      `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortToken}`
    )
    if (!longRes.ok) throw new Error('Failed to exchange for long-lived Facebook token')
    const { access_token: userToken, expires_in } = await longRes.json() as { access_token: string; expires_in?: number }

    // 3. Get a Page access token (long-lived, non-expiring for pages)
    const pagesRes = await fetch(`${GRAPH_API}/me/accounts?access_token=${userToken}`)
    if (!pagesRes.ok) throw new Error('Failed to fetch Facebook pages')
    const pages = await pagesRes.json() as { data?: Array<{ id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }> }
    const page = pages.data?.[0]
    if (!page) throw new Error('No Facebook page found for this user')

    // 4. Fetch page profile picture
    const picRes = await fetch(`${GRAPH_API}/${page.id}/picture?redirect=false&access_token=${page.access_token}`)
    const picData = await picRes.json() as { data?: { url?: string } }

    return {
      accessToken: page.access_token,
      platformAccountId: page.id,
      displayName: page.name,
      avatarUrl: picData.data?.url,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      scopes: ['pages_manage_posts', 'pages_read_engagement'],
    }
  }

  async refreshToken(_account: { accessToken: string }): Promise<RefreshResult> {
    // Facebook page tokens are non-expiring; return as-is
    return { accessToken: _account.accessToken }
  }

  async publish(input: PublishInput, _idempotencyKey: string, account: { accessToken: string; platformAccountId?: string }): Promise<PublishResult> {
    const pageId = account.platformAccountId
    if (!pageId) throw new Error('platformAccountId required for Facebook publish')

    const body: Record<string, string> = {
      message: input.content,
      access_token: account.accessToken,
    }
    if (input.mediaUrls?.[0]) body['link'] = input.mediaUrls[0]

    const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    })
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } }
      throw new Error(`Facebook publish failed: ${err.error?.message}`)
    }
    const { id: platformPostId } = await res.json() as { id: string }
    return { platformPostId }
  }

  async syncPosts(
    account: { accessToken: string; platformAccountId: string },
    checkpoint?: string | null
  ): Promise<SyncPostsResult> {
    let url = `${GRAPH_API}/${account.platformAccountId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true)&limit=20&access_token=${account.accessToken}`
    if (checkpoint) url += `&after=${checkpoint}`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Facebook syncPosts failed: ${res.status}`)
    const data = await res.json() as {
      data: Array<{
        id: string
        message?: string
        created_time?: string
        likes?: { summary?: { total_count?: number } }
        comments?: { summary?: { total_count?: number } }
      }>
      paging?: { cursors?: { after?: string } }
    }

    return {
      posts: data.data.map((p) => ({
        platformPostId: p.id,
        content: p.message,
        publishedAt: p.created_time ? new Date(p.created_time) : undefined,
        likeCount: p.likes?.summary?.total_count,
        commentCount: p.comments?.summary?.total_count,
      })),
      nextCheckpoint: data.paging?.cursors?.after ?? null,
    }
  }

  async syncAnalytics(account: { accessToken: string }, platformPostId: string): Promise<AnalyticsSnapshot> {
    const res = await fetch(
      `${GRAPH_API}/${platformPostId}/insights?metric=post_impressions,post_reach,post_reactions_like_total,post_comments&access_token=${account.accessToken}`
    )
    if (!res.ok) return {}
    const data = await res.json() as { data: Array<{ name: string; values: Array<{ value: number }> }> }
    const m: Record<string, number> = {}
    for (const metric of data.data) {
      m[metric.name] = metric.values[0]?.value ?? 0
    }
    return {
      likes: m['post_reactions_like_total'],
      comments: m['post_comments'],
      views: m['post_impressions'],
      reach: m['post_reach'],
    }
  }

  async disconnect(account: { accessToken: string }): Promise<void> {
    await fetch(`${GRAPH_API}/me/permissions?access_token=${account.accessToken}`, {
      method: 'DELETE',
    }).catch(() => {})
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    const expected = `sha256=${crypto.createHmac('sha256', this.appSecret).update(rawBody).digest('hex')}`
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  async handleWebhook(payload: unknown): Promise<WebhookEvent> {
    const body = payload as { object?: string; entry?: unknown[] }
    return { type: `meta.${body.object ?? 'unknown'}`, data: body }
  }
}
