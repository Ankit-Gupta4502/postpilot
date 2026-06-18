import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { authPlugin } from './plugins/auth'
import { orgsRouter } from './routes/orgs'
import { workspacesRouter } from './routes/workspaces'
import { socialAccountsRouter } from './routes/social-accounts'
import { oauthRouter } from './routes/oauth'
import { postsRouter } from './routes/posts'
import { mediaRouter } from './routes/media'
import { billingRouter } from './routes/billing'
import { webhooksRouter } from './routes/webhooks'
import { invitesRouter } from './routes/invites'
import { analyticsRouter } from './routes/analytics'

const app = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
    transport:
      process.env['NODE_ENV'] !== 'production' ? { target: 'pino-pretty' } : undefined,
  },
})

await app.register(cors, {
  origin: process.env['APP_BASE_URL'] ?? 'http://localhost:3000',
  credentials: true,
})
await app.register(cookie)
await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
})
await app.register(authPlugin)

await app.register(orgsRouter, { prefix: '/api/orgs' })
await app.register(workspacesRouter, { prefix: '/api/workspaces' })
await app.register(socialAccountsRouter, { prefix: '/api/social-accounts' })
await app.register(oauthRouter, { prefix: '/oauth' })
await app.register(postsRouter, { prefix: '/api/posts' })
await app.register(mediaRouter, { prefix: '/api/media' })
await app.register(billingRouter, { prefix: '/api/billing' })
await app.register(webhooksRouter, { prefix: '/api/webhooks' })
await app.register(invitesRouter, { prefix: '/api/invites' })
await app.register(analyticsRouter, { prefix: '/api/analytics' })

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = Number(process.env['PORT'] ?? 8080)
try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
