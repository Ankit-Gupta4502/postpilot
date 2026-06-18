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

const API = 'https://www.googleapis.com/youtube/v3'
const AUTH = 'https://oauth2.googleapis.com'

export class YouTubeAdapter implements PlatformAdapter {
  private readonly clientId = process.env['YOUTUBE_CLIENT_ID']!
  private readonly clientSecret = process.env['YOUTUBE_CLIENT_SECRET']!

  async connect(code: string, redirectUri: string): Promise<ConnectResult> {
    const tokenRes = await fetch(`${AUTH}/token`, {
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
    if (!tokenRes.ok) throw new Error(`YouTube token exchange failed: ${tokenRes.status}`)
    const { access_token: accessToken, refresh_token: refreshToken, expires_in } = await tokenRes.json() as {
      access_token: string; refresh_token?: string; expires_in?: number
    }

    const channelRes = await fetch(
      `${API}/channels?part=snippet&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!channelRes.ok) throw new Error(`YouTube channel fetch failed: ${channelRes.status}`)
    const channels = await channelRes.json() as {
      items?: Array<{ id: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }>
    }
    const channel = channels.items?.[0]
    if (!channel) throw new Error('No YouTube channel found')

    return {
      accessToken,
      refreshToken,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
      platformAccountId: channel.id,
      displayName: channel.snippet?.title,
      avatarUrl: channel.snippet?.thumbnails?.default?.url,
      scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    }
  }

  async refreshToken(account: { accessToken: string; refreshToken?: string | null }): Promise<RefreshResult> {
    if (!account.refreshToken) throw new Error('No refresh token for YouTube')
    const res = await fetch(`${AUTH}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })
    if (!res.ok) throw new Error(`YouTube token refresh failed: ${res.status}`)
    const { access_token, expires_in } = await res.json() as { access_token: string; expires_in?: number }
    return {
      accessToken: access_token,
      refreshToken: account.refreshToken ?? undefined,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
    }
  }

  async publish(_input: PublishInput, _idempotencyKey: string, _account: { accessToken: string }): Promise<PublishResult> {
    // YouTube video upload requires a resumable multipart upload; it cannot be done inline.
    // The proper flow: upload video bytes first (R2 → YouTube via resumable upload API),
    // then the media row is marked ready and the publish job runs.
    // For now, throw to surface this requirement explicitly.
    throw new Error(
      'YouTube video upload requires a resumable upload flow (upload the video file first, then pass the YouTube video ID as mediaUrls[0])'
    )
  }

  async syncPosts(
    account: { accessToken: string; platformAccountId: string },
    checkpoint?: string | null
  ): Promise<SyncPostsResult> {
    let url = `${API}/search?part=snippet&forMine=true&type=video&order=date&maxResults=20`
    if (checkpoint) url += `&pageToken=${checkpoint}`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${account.accessToken}` } })
    if (!res.ok) throw new Error(`YouTube syncPosts failed: ${res.status}`)
    const data = await res.json() as {
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string } }>
      nextPageToken?: string
    }

    return {
      posts: (data.items ?? []).map((v) => ({
        platformPostId: v.id?.videoId ?? '',
        content: v.snippet?.description,
        publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : undefined,
      })).filter((p) => p.platformPostId),
      nextCheckpoint: data.nextPageToken ?? null,
    }
  }

  async syncAnalytics(account: { accessToken: string }, platformPostId: string): Promise<AnalyticsSnapshot> {
    const res = await fetch(
      `${API}/videos?part=statistics&id=${platformPostId}`,
      { headers: { Authorization: `Bearer ${account.accessToken}` } }
    )
    if (!res.ok) return {}
    const data = await res.json() as {
      items?: Array<{ statistics?: { likeCount?: string; commentCount?: string; viewCount?: string } }>
    }
    const stats = data.items?.[0]?.statistics
    return {
      likes: stats?.likeCount ? parseInt(stats.likeCount, 10) : undefined,
      comments: stats?.commentCount ? parseInt(stats.commentCount, 10) : undefined,
      views: stats?.viewCount ? parseInt(stats.viewCount, 10) : undefined,
    }
  }

  async disconnect(account: { accessToken: string }): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${account.accessToken}`, {
      method: 'POST',
    }).catch(() => {})
  }

  verifyWebhook(_rawBody: string, _signature: string): boolean {
    // YouTube push notifications use Atom feeds (PubSubHubbub); no HMAC signature.
    return true
  }

  async handleWebhook(payload: unknown): Promise<WebhookEvent> {
    return { type: 'youtube.notification', data: payload }
  }
}
