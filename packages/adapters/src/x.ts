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

const API = 'https://api.twitter.com/2'
const AUTH = 'https://twitter.com/i/oauth2'

export class XAdapter implements PlatformAdapter {
  private readonly clientId = process.env['X_CLIENT_ID']!
  private readonly clientSecret = process.env['X_CLIENT_SECRET']!
  private readonly webhookSecret = process.env['X_WEBHOOK_SECRET'] ?? ''

  async connect(code: string, redirectUri: string, codeVerifier?: string): Promise<ConnectResult> {
    if (!codeVerifier) throw new Error('X OAuth 2.0 requires a PKCE code_verifier')

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const tokenRes = await fetch(`${AUTH}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    })
    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`X token exchange failed: ${err}`)
    }
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in,
      scope,
    } = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }

    const meRes = await fetch(`${API}/users/me?user.fields=name,username,profile_image_url`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!meRes.ok) throw new Error(`X user fetch failed: ${meRes.status}`)
    const { data: me } = await meRes.json() as { data: { id: string; name: string; username: string; profile_image_url?: string } }

    return {
      accessToken,
      refreshToken,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      platformAccountId: me.id,
      username: me.username,
      displayName: me.name,
      avatarUrl: me.profile_image_url,
      scopes: scope?.split(' ') ?? [],
    }
  }

  async refreshToken(account: { accessToken: string; refreshToken?: string | null }): Promise<RefreshResult> {
    if (!account.refreshToken) throw new Error('No refresh token for X')
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const res = await fetch(`${AUTH}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: this.clientId,
      }),
    })
    if (!res.ok) throw new Error(`X token refresh failed: ${res.status}`)
    const { access_token, refresh_token, expires_in } = await res.json() as {
      access_token: string; refresh_token?: string; expires_in?: number
    }
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
    }
  }

  async publish(input: PublishInput, _idempotencyKey: string, account: { accessToken: string }): Promise<PublishResult> {
    const body: Record<string, unknown> = { text: input.content }
    if (input.mediaUrls?.length) {
      // Media must be uploaded separately via v1.1 media/upload — attach ids here
      // For now pass media_ids if already provided in metadata
      const mediaIds = (input.metadata?.['media_ids'] as string[]) ?? []
      if (mediaIds.length) body['media'] = { media_ids: mediaIds }
    }

    const res = await fetch(`${API}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`X tweet failed: ${err}`)
    }
    const { data } = await res.json() as { data: { id: string; text: string } }
    return {
      platformPostId: data.id,
      url: `https://x.com/i/web/status/${data.id}`,
    }
  }

  async syncPosts(
    account: { accessToken: string; platformAccountId: string },
    checkpoint?: string | null
  ): Promise<SyncPostsResult> {
    let url = `${API}/users/${account.platformAccountId}/tweets?max_results=20&tweet.fields=created_at,public_metrics`
    if (checkpoint) url += `&since_id=${checkpoint}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    })
    if (!res.ok) throw new Error(`X syncPosts failed: ${res.status}`)
    const data = await res.json() as {
      data?: Array<{ id: string; text: string; created_at?: string; public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number; impression_count?: number } }>
      meta?: { newest_id?: string }
    }

    return {
      posts: (data.data ?? []).map((t) => ({
        platformPostId: t.id,
        content: t.text,
        publishedAt: t.created_at ? new Date(t.created_at) : undefined,
        likeCount: t.public_metrics?.like_count,
        commentCount: t.public_metrics?.reply_count,
        shareCount: t.public_metrics?.retweet_count,
        viewCount: t.public_metrics?.impression_count,
      })),
      nextCheckpoint: data.meta?.newest_id ?? null,
    }
  }

  async syncAnalytics(account: { accessToken: string }, platformPostId: string): Promise<AnalyticsSnapshot> {
    const res = await fetch(
      `${API}/tweets/${platformPostId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${account.accessToken}` } }
    )
    if (!res.ok) return {}
    const { data } = await res.json() as { data: { public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number; impression_count?: number } } }
    return {
      likes: data.public_metrics?.like_count,
      comments: data.public_metrics?.reply_count,
      shares: data.public_metrics?.retweet_count,
      views: data.public_metrics?.impression_count,
    }
  }

  async disconnect(account: { accessToken: string }): Promise<void> {
    await fetch(`${AUTH}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: account.accessToken, client_id: this.clientId }),
    }).catch(() => {})
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false
    const hmac = `sha256=${crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('base64')}`
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac))
    } catch {
      return false
    }
  }

  async handleWebhook(payload: unknown): Promise<WebhookEvent> {
    const body = payload as Record<string, unknown>
    const type = Object.keys(body).find((k) => k !== 'for_user_id') ?? 'x.unknown'
    return { type: `x.${type}`, data: body }
  }
}
