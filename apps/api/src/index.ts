import './env.js'
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
import { adminRouter } from './routes/admin'

function resolvePinoTransport() {
  if (process.env['NODE_ENV'] === 'production') return undefined
  try {
    import.meta.resolve('pino-pretty')
    return { target: 'pino-pretty' }
  } catch {
    return undefined
  }
}

const app = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
    transport: resolvePinoTransport(),
  },
})

await app.register(cors, {
  origin: process.env['CORS_ORIGIN'] ?? process.env['APP_BASE_URL'] ?? 'http://localhost:5173',
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
await app.register(adminRouter, { prefix: '/api/admin' })

app.setErrorHandler((rawErr, req, reply) => {
  const err = rawErr as Error & { validation?: unknown; statusCode?: number }

  if (err.validation) {
    return reply.status(400).send({ code: 'VALIDATION_ERROR', message: err.message })
  }

  if (err.statusCode && err.statusCode < 500) {
    return reply.status(err.statusCode).send({ code: 'REQUEST_ERROR', message: err.message })
  }

  req.log.error({ err, url: req.url, method: req.method }, 'Unhandled route error')
  return reply.status(500).send({
    code: 'INTERNAL_ERROR',
    message: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : err.message,
  })
})

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const port = Number(process.env['PORT'] ?? 8080)
try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
