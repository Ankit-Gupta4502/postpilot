import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and, desc } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { enqueueMessage } from '../lib/queue'
import { ok, fail } from '../lib/response'

function requireOrgOwner(roles: string[]) {
  return async function checkRole(req: Parameters<typeof requireOrg>[0], reply: Parameters<typeof requireOrg>[1]) {
    await requireOrg(req, reply)
    if (reply.sent) return
    if (!roles.includes(req.orgRole ?? '')) {
      return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Owner or admin required' })
    }
  }
}

const ownerOrAdmin = requireOrgOwner(['owner', 'admin'])

export const adminRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { status?: string; limit?: number } }>(
    '/dlq',
    { preHandler: [ownerOrAdmin] },
    async (req, reply) => {
      const { status, limit } = req.query
      const validStatus = ['open', 'replayed', 'discarded']
      const statusFilter = status && validStatus.includes(status)
        ? (status as 'open' | 'replayed' | 'discarded')
        : undefined

      const jobs = await db.query.deadLetterJobs.findMany({
        where: statusFilter ? eq(schema.deadLetterJobs.status, statusFilter) : undefined,
        orderBy: [desc(schema.deadLetterJobs.lastFailedAt)],
        limit: Math.min(Number(limit ?? 50), 200),
      })

      return ok(reply, { data: { jobs }, message: 'Dead-letter jobs retrieved' })
    }
  )

  fastify.post<{ Params: { id: string } }>(
    '/dlq/:id/replay',
    { preHandler: [ownerOrAdmin] },
    async (req, reply) => {
      const job = await db.query.deadLetterJobs.findFirst({
        where: eq(schema.deadLetterJobs.id, req.params.id),
      })
      if (!job) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Job not found' })
      if (job.status !== 'open') {
        return fail(reply, { status: 422, code: 'ALREADY_PROCESSED', message: 'Job has already been processed', extra: { jobStatus: job.status } })
      }

      await enqueueMessage(job.sourceQueue, job.payload)

      await db.update(schema.deadLetterJobs)
        .set({ status: 'replayed', replayedAt: new Date() })
        .where(eq(schema.deadLetterJobs.id, job.id))

      return ok(reply, { data: { replayed: true }, message: 'Job replayed' })
    }
  )

  fastify.post<{ Params: { id: string } }>(
    '/dlq/:id/discard',
    { preHandler: [ownerOrAdmin] },
    async (req, reply) => {
      const job = await db.query.deadLetterJobs.findFirst({
        where: and(
          eq(schema.deadLetterJobs.id, req.params.id),
          eq(schema.deadLetterJobs.status, 'open')
        ),
        columns: { id: true },
      })
      if (!job) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Job not found or already processed' })

      await db.update(schema.deadLetterJobs)
        .set({ status: 'discarded' })
        .where(eq(schema.deadLetterJobs.id, job.id))

      return ok(reply, { data: { discarded: true }, message: 'Job discarded' })
    }
  )
}
