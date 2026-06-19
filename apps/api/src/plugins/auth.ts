import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { auth } from '../lib/auth'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null
    orgId: string | null
    orgRole: string | null
  }
}

/** Convert a Node.js IncomingMessage + raw body into a Fetch API Request for Better Auth. */
function toFetchRequest(req: FastifyRequest): Request {
  const url = `${req.protocol}://${req.headers['host'] ?? 'localhost'}${req.url}`
  const headers = new Headers(req.headers as Record<string, string>)
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? JSON.stringify(req.body) : undefined,
  })
}

const plugin: FastifyPluginAsync = async (fastify) => {
  // Delegate all /api/auth/* to Better Auth
  fastify.all('/api/auth/*', async (req: FastifyRequest, reply: FastifyReply) => {
    const response = await auth.handler(toFetchRequest(req))
    reply.status(response.status)
    response.headers.forEach((value, key) => reply.header(key, value))
    return reply.send(response.body)
  })

  fastify.decorateRequest('userId', null)
  fastify.decorateRequest('orgId', null)
  fastify.decorateRequest('orgRole', null)

  fastify.addHook('preHandler', async (req: FastifyRequest) => {
    const session = await auth.api.getSession({ headers: req.headers as unknown as Headers })
    if (!session) return

    req.userId = session.user.id

    const orgId = req.headers['x-org-id'] as string | undefined
    if (!orgId) return

    const member = await db.query.orgMembers.findFirst({
      where: and(
        eq(schema.orgMembers.orgId, orgId),
        eq(schema.orgMembers.userId, session.user.id),
        eq(schema.orgMembers.status, 'active')
      ),
    })
    if (member) {
      req.orgId = orgId
      req.orgRole = member.role
    }
  })
}

export const authPlugin = fp(plugin, { name: 'auth' })
