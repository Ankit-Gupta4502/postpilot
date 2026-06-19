import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and, desc } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { enqueueMessage } from '../lib/queue'

function requireOrgOwner(roles: string[]) {
  return async function checkRole(req: Parameters<typeof requireOrg>[0], reply: Parameters<typeof requireOrg>[1]) {
    await requireOrg(req, reply)
    if (reply.sent) return
    if (!roles.includes(req.orgRole ?? '')) {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'Owner or admin required' })
    }
  }
}

const ownerOrAdmin = requireOrgOwner(['owner', 'admin'])

export const adminRouter: FastifyPluginAsync = async (fastify) => {
  // List dead-letter jobs for the org's queues (all orgs share queues; filter by jobRef if needed)
  fastify.get<{
    Querystring: { status?: string; limit?: number }
  }>(
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

      return reply.send({ jobs })
    }
  )

  // Replay a dead-letter job — re-enqueue its payload to the source queue
  fastify.post<{ Params: { id: string } }>(
    '/dlq/:id/replay',
    { preHandler: [ownerOrAdmin] },
    async (req, reply) => {
      const job = await db.query.deadLetterJobs.findFirst({
        where: eq(schema.deadLetterJobs.id, req.params.id),
      })
      if (!job) return reply.status(404).send({ code: 'NOT_FOUND' })
      if (job.status !== 'open') {
        return reply.status(422).send({ code: 'ALREADY_PROCESSED', status: job.status })
      }

      await enqueueMessage(job.sourceQueue, job.payload)

      await db.update(schema.deadLetterJobs)
        .set({ status: 'replayed', replayedAt: new Date() })
        .where(eq(schema.deadLetterJobs.id, job.id))

      return reply.send({ replayed: true })
    }
  )

  // Discard a dead-letter job — mark as discarded, no re-enqueue
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
      if (!job) return reply.status(404).send({ code: 'NOT_FOUND' })

      await db.update(schema.deadLetterJobs)
        .set({ status: 'discarded' })
        .where(eq(schema.deadLetterJobs.id, job.id))

      return reply.send({ discarded: true })
    }
  )
}
