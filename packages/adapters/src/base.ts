/** Shared input/output types for the PlatformAdapter interface (§7). */

export interface ConnectResult {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  platformAccountId: string
  username?: string
  displayName?: string
  avatarUrl?: string
  scopes?: string[]
}

export interface RefreshResult {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

export interface PublishInput {
  content: string
  mediaUrls?: string[]
  metadata?: Record<string, unknown>
}

export interface PublishResult {
  platformPostId: string
  url?: string
}

export interface SyncedPost {
  platformPostId: string
  content?: string | null
  publishedAt?: Date | null
  likeCount?: number
  commentCount?: number
  shareCount?: number
  viewCount?: number
  reachCount?: number
}

export interface SyncPostsResult {
  posts: SyncedPost[]
  nextCheckpoint?: string | null
}

export interface AnalyticsSnapshot {
  likes?: number
  comments?: number
  shares?: number
  views?: number
  reach?: number
}

export interface WebhookEvent {
  type: string
  data: unknown
}

/**
 * Every platform must implement this interface.
 * All methods that call the platform API must be safe to call concurrently
 * from multiple worker processes (idempotent where side effects occur).
 */
export interface PlatformAdapter {
  /** Exchange an OAuth authorization code for tokens and account info. */
  connect(code: string, redirectUri: string, codeVerifier?: string): Promise<ConnectResult>

  /** Rotate a near-expiry access token using the refresh token. */
  refreshToken(account: {
    accessToken: string
    refreshToken?: string | null
    platformAccountId: string
  }): Promise<RefreshResult>

  /**
   * Publish a post.  Must be idempotent — calling twice with the same
   * idempotencyKey must not create two platform posts.
   */
  publish(input: PublishInput, idempotencyKey: string, account: { accessToken: string; platformAccountId?: string }): Promise<PublishResult>

  /** Import posts since the last checkpoint. Returns a new checkpoint for the next call. */
  syncPosts(
    account: { accessToken: string; platformAccountId: string },
    checkpoint?: string | null
  ): Promise<SyncPostsResult>

  /** Fetch current engagement metrics for one platform post. */
  syncAnalytics(account: { accessToken: string }, platformPostId: string): Promise<AnalyticsSnapshot>

  /** Revoke the token at the provider (best-effort — do not throw on 404). */
  disconnect(account: { accessToken: string }): Promise<void>

  /** Verify an inbound webhook signature. Return false → reject with 401. */
  verifyWebhook(rawBody: string, signature: string): boolean

  /** Parse a verified webhook payload into a typed event. */
  handleWebhook(payload: unknown): Promise<WebhookEvent>
}
