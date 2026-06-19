import type { FastifyPluginAsync } from 'fastify'
import { createHash, randomBytes } from 'node:crypto'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { getAdapter } from '@postpilot/adapters'
import { encrypt } from '../lib/encryption'
import { enqueueMessage } from '../lib/queue'
import { QUEUE_NAMES } from '@postpilot/shared'
import { requireAuth } from '../middleware/require-auth'

function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

const OAUTH_CONFIGS: Record<string, { authUrl: string; scopes: string; pkce?: boolean }> = {
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    scopes: 'instagram_basic,instagram_content_publish,pages_read_engagement',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    scopes: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: 'r_liteprofile,r_emailaddress,w_member_social',
    pkce: true,
  },
  x: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: 'tweet.read tweet.write users.read offline.access',
    pkce: true,
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload',
  },
}

const CLIENT_ID_ENV: Record<string, string> = {
  instagram: 'INSTAGRAM_CLIENT_ID',
  facebook: 'FACEBOOK_APP_ID',
  linkedin: 'LINKEDIN_CLIENT_ID',
  x: 'X_CLIENT_ID',
  youtube: 'YOUTUBE_CLIENT_ID',
}

export const oauthRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /oauth/:platform/init?workspaceId=...
   *
   * Creates an oauth_states row and redirects the browser to the platform's
   * authorization URL. The frontend just navigates here; no JSON exchange needed.
   */
  fastify.get<{
    Params: { platform: string }
    Querystring: { workspaceId: string }
  }>('/:platform/init', { preHandler: [requireAuth] }, async (req, reply) => {
    const { platform } = req.params
    const { workspaceId } = req.query
    const config = OAUTH_CONFIGS[platform]
    if (!config) return reply.status(400).send({ error: 'Unknown platform' })

    const clientIdKey = CLIENT_ID_ENV[platform]!
    const clientId = process.env[clientIdKey]
    if (!clientId) return reply.status(500).send({ error: `${clientIdKey} is not configured` })

    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    })
    if (!workspace) return reply.status(404).send({ error: 'Workspace not found' })

    const state = randomBytes(16).toString('hex')
    const redirectUri = `${process.env['APP_BASE_URL'] ?? 'http://localhost:8080'}/oauth/${platform}/callback`

    let codeVerifier: string | undefined
    if (config.pkce) {
      codeVerifier = generateCodeVerifier()
    }

    await db.insert(schema.oauthStates).values({
      state,
      orgId: workspace.orgId,
      workspaceId,
      platform,
      createdBy: req.userId!,
      redirectUri,
      codeVerifier: codeVerifier ?? null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: config.scopes,
      state,
      response_type: 'code',
    })

    if (platform === 'youtube') {
      params.set('access_type', 'offline')
      params.set('prompt', 'consent')
    }

    if (config.pkce && codeVerifier) {
      params.set('code_challenge', generateCodeChallenge(codeVerifier))
      params.set('code_challenge_method', 'S256')
    }

    return reply.redirect(`${config.authUrl}?${params.toString()}`)
  })
  /**
   * GET /oauth/:platform/callback
   *
   * Provider redirects here after the user grants access.
   * - Validates the state param against oauth_states (single-use, expiry)
   * - Exchanges the code for tokens via the platform adapter
   * - Encrypts tokens and upserts social_accounts
   * - Enqueues an initial sync
   * - Redirects the browser back to the workspace dashboard
   */
  fastify.get<{
    Params: { platform: string }
    Querystring: { code?: string; state?: string; error?: string; error_description?: string }
  }>(
    '/:platform/callback',
    async (req, reply) => {
      const { platform } = req.params
      const { code, state, error, error_description } = req.query
      const appBaseUrl = process.env['APP_BASE_URL'] ?? 'http://localhost:5173'

      if (error) {
        return reply.redirect(`${appBaseUrl}/dashboard?error=${encodeURIComponent(error_description ?? error)}`)
      }
      if (!code || !state) {
        return reply.redirect(`${appBaseUrl}/dashboard?error=missing_params`)
      }

      // 1. Validate + consume the oauth_state (single-use CSRF token)
      const oauthState = await db.query.oauthStates.findFirst({
        where: and(
          eq(schema.oauthStates.state, state),
          eq(schema.oauthStates.platform, platform)
        ),
      })

      if (!oauthState) {
        return reply.redirect(`${appBaseUrl}/dashboard?error=invalid_state`)
      }
      if (oauthState.consumedAt) {
        return reply.redirect(`${appBaseUrl}/dashboard?error=state_already_used`)
      }
      if (oauthState.expiresAt < new Date()) {
        return reply.redirect(`${appBaseUrl}/dashboard?error=state_expired`)
      }

      // Mark state consumed immediately (before the token exchange so a retry can't race)
      await db.update(schema.oauthStates)
        .set({ consumedAt: new Date() })
        .where(eq(schema.oauthStates.id, oauthState.id))

      try {
        // 2. Exchange code for tokens via the platform adapter
        const adapter = getAdapter(platform)
        const result = await adapter.connect(
          code,
          oauthState.redirectUri,
          oauthState.codeVerifier ?? undefined
        )

        // 3. Encrypt tokens before persistence (§11)
        const encryptedAccess = encrypt(result.accessToken)
        const encryptedRefresh = result.refreshToken ? encrypt(result.refreshToken) : null

        // 4. Upsert social_accounts (unique: workspace + platform + platformAccountId)
        const [account] = await db
          .insert(schema.socialAccounts)
          .values({
            orgId: oauthState.orgId,
            workspaceId: oauthState.workspaceId,
            platform: platform as typeof schema.socialAccounts.$inferInsert['platform'],
            platformAccountId: result.platformAccountId,
            username: result.username,
            displayName: result.displayName,
            avatarUrl: result.avatarUrl,
            accessToken: encryptedAccess,
            refreshToken: encryptedRefresh,
            expiresAt: result.expiresAt,
            scopes: result.scopes,
            status: 'connected',
            healthStatus: 'healthy',
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              schema.socialAccounts.workspaceId,
              schema.socialAccounts.platform,
              schema.socialAccounts.platformAccountId,
            ],
            set: {
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              expiresAt: result.expiresAt,
              scopes: result.scopes,
              username: result.username,
              displayName: result.displayName,
              avatarUrl: result.avatarUrl,
              status: 'connected',
              healthStatus: 'healthy',
              updatedAt: new Date(),
            },
          })
          .returning()

        if (!account) throw new Error('Failed to upsert social account')

        // 5. Write audit log
        await db.insert(schema.auditLog).values({
          orgId: oauthState.orgId,
          actorUser: oauthState.createdBy,
          action: 'account.connect',
          targetType: 'social_account',
          targetId: account.id,
          metadata: JSON.stringify({ platform, username: result.username }),
        })

        // 6. Enqueue initial sync (latest 20 posts)
        await enqueueMessage(QUEUE_NAMES.SYNC_POSTS, {
          socialAccountId: account.id,
          syncType: 'initial',
        }).catch((err) => {
          // Non-fatal — the sync will run on the next polling cycle anyway
          fastify.log.warn({ err }, 'Failed to enqueue initial sync after connect')
        })

        return reply.redirect(
          `${appBaseUrl}/workspaces/${oauthState.workspaceId}/accounts?connected=${platform}`
        )
      } catch (err) {
        fastify.log.error({ err, platform }, 'OAuth callback error')
        return reply.redirect(`${appBaseUrl}/dashboard?error=connect_failed`)
      }
    }
  )
}
