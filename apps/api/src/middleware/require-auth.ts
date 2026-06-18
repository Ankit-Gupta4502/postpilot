import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.userId) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
}

export async function requireOrg(req: FastifyRequest, reply: FastifyReply) {
  if (!req.userId) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
  if (!req.orgId) {
    return reply
      .status(403)
      .send({ code: 'FORBIDDEN', message: 'Organization context required — send X-Org-Id header' })
  }
}
