import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { fromNodeHeaders } from 'better-auth/node'
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

function applyAuthResponseHeaders(reply: FastifyReply, headers: Headers) {
  const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : []
  for (const cookie of setCookies) {
    reply.header('set-cookie', cookie)
  }
  headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') reply.header(key, value)
  })
}

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.all('/api/auth/*', async (req: FastifyRequest, reply: FastifyReply) => {
    const url = new URL(req.url, `${req.protocol}://${req.headers.host}`)
    req.log.info({ method: req.method, url: url.toString() }, '[auth] incoming request')

    const body = req.method !== 'GET' && req.method !== 'HEAD' && req.body
      ? JSON.stringify(req.body)
      : undefined

    const request = new Request(url.toString(), {
      method: req.method,
      headers: fromNodeHeaders(req.raw.headers),
      body,
    })

    const response = await auth.handler(request)
    req.log.info({ status: response.status, url: url.toString() }, '[auth] response')

    reply.status(response.status)
    applyAuthResponseHeaders(reply, response.headers)

    const text = await response.text()
    return reply.send(text || null)
  })

  fastify.decorateRequest('userId', null)
  fastify.decorateRequest('orgId', null)
  fastify.decorateRequest('orgRole', null)

  fastify.addHook('preHandler', async (req: FastifyRequest) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.raw.headers) })
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
