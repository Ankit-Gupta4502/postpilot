import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import { authPlugin } from './plugins/auth.js'
import { orgsRouter } from './routes/orgs.js'
import { workspacesRouter } from './routes/workspaces.js'
import { socialAccountsRouter } from './routes/social-accounts.js'
import { postsRouter } from './routes/posts.js'
import { billingRouter } from './routes/billing.js'
import { webhooksRouter } from './routes/webhooks.js'

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
await app.register(authPlugin)

await app.register(orgsRouter, { prefix: '/api/orgs' })
await app.register(workspacesRouter, { prefix: '/api/workspaces' })
await app.register(socialAccountsRouter, { prefix: '/api/social-accounts' })
await app.register(postsRouter, { prefix: '/api/posts' })
await app.register(billingRouter, { prefix: '/api/billing' })
await app.register(webhooksRouter, { prefix: '/api/webhooks' })

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = Number(process.env['PORT'] ?? 8080)
try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
