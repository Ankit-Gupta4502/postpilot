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

const API = 'https://api.linkedin.com/v2'
const AUTH = 'https://www.linkedin.com/oauth/v2'

export class LinkedInAdapter implements PlatformAdapter {
  private readonly clientId = process.env['LINKEDIN_CLIENT_ID']!
  private readonly clientSecret = process.env['LINKEDIN_CLIENT_SECRET']!
  private readonly webhookSecret = process.env['LINKEDIN_WEBHOOK_SECRET'] ?? ''

  async connect(code: string, redirectUri: string): Promise<ConnectResult> {
    const tokenRes = await fetch(`${AUTH}/accessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })
    if (!tokenRes.ok) throw new Error(`LinkedIn token exchange failed: ${tokenRes.status}`)
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in,
      refresh_token_expires_in,
    } = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      refresh_token_expires_in?: number
    }

    const profileRes = await fetch(`${API}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) throw new Error(`LinkedIn profile fetch failed: ${profileRes.status}`)
    const profile = await profileRes.json() as {
      sub: string
      name?: string
      given_name?: string
      family_name?: string
      picture?: string
      email?: string
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      platformAccountId: profile.sub,
      displayName: profile.name ?? `${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim(),
      avatarUrl: profile.picture,
      scopes: ['openid', 'profile', 'email', 'w_member_social'],
    }
  }

  async refreshToken(account: { accessToken: string; refreshToken?: string | null }): Promise<RefreshResult> {
    if (!account.refreshToken) throw new Error('No refresh token available for LinkedIn')
    const res = await fetch(`${AUTH}/accessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })
    if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${res.status}`)
    const { access_token, refresh_token, expires_in } = await res.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
    }
  }

  async publish(input: PublishInput, _idempotencyKey: string, account: { accessToken: string; platformAccountId?: string }): Promise<PublishResult> {
    const authorUrn = `urn:li:person:${account.platformAccountId}`
    const body: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: input.content },
          shareMediaCategory: input.mediaUrls?.length ? 'IMAGE' : 'NONE',
          ...(input.mediaUrls?.length ? {
            media: input.mediaUrls.map((url) => ({ status: 'READY', originalUrl: url })),
          } : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }

    const res = await fetch(`${API}/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LinkedIn publish failed: ${err}`)
    }
    const data = await res.json() as { id: string }
    const platformPostId = data.id
    return { platformPostId, url: `https://www.linkedin.com/feed/update/${platformPostId}` }
  }

  async syncPosts(
    account: { accessToken: string; platformAccountId: string },
    checkpoint?: string | null
  ): Promise<SyncPostsResult> {
    const start = checkpoint ? parseInt(checkpoint, 10) : 0
    const url = `${API}/ugcPosts?q=authors&authors=List(urn:li:person:${account.platformAccountId})&count=20${start ? `&start=${start}` : ''}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })
    if (!res.ok) throw new Error(`LinkedIn syncPosts failed: ${res.status}`)
    const data = await res.json() as {
      elements: Array<{ id: string; specificContent?: { 'com.linkedin.ugc.ShareContent'?: { shareCommentary?: { text?: string } } }; created?: { time?: number } }>
      paging?: { start?: number; count?: number; total?: number }
    }

    const nextStart = (data.paging?.start ?? 0) + (data.paging?.count ?? 0)
    const hasMore = nextStart < (data.paging?.total ?? 0)

    return {
      posts: data.elements.map((p) => ({
        platformPostId: p.id,
        content: p.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text,
        publishedAt: p.created?.time ? new Date(p.created.time) : undefined,
      })),
      nextCheckpoint: hasMore ? String(nextStart) : null,
    }
  }

  async syncAnalytics(account: { accessToken: string }, platformPostId: string): Promise<AnalyticsSnapshot> {
    const res = await fetch(
      `${API}/socialMetadata/${encodeURIComponent(platformPostId)}`,
      { headers: { Authorization: `Bearer ${account.accessToken}` } }
    )
    if (!res.ok) return {}
    const data = await res.json() as {
      totalShareStatistics?: {
        likeCount?: number
        commentCount?: number
        shareCount?: number
        impressionCount?: number
      }
    }
    return {
      likes: data.totalShareStatistics?.likeCount,
      comments: data.totalShareStatistics?.commentCount,
      shares: data.totalShareStatistics?.shareCount,
      views: data.totalShareStatistics?.impressionCount,
    }
  }

  async disconnect(account: { accessToken: string }): Promise<void> {
    // LinkedIn does not provide a token revocation endpoint in v2; best-effort no-op
    await fetch(`https://www.linkedin.com/oauth/v2/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: account.accessToken, client_id: this.clientId, client_secret: this.clientSecret }),
    }).catch(() => {})
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  async handleWebhook(payload: unknown): Promise<WebhookEvent> {
    const body = payload as { eventType?: string }
    return { type: body.eventType ?? 'linkedin.unknown', data: body }
  }
}
