import type { FastifyPluginAsync } from 'fastify'
import { requireOrg } from '../middleware/require-auth.js'

export const billingRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/plans', async (_req, reply) => {
    return reply.send([
      { plan: 'free', price: 0, currency: 'INR' },
      { plan: 'starter', price: 99900, currency: 'INR' },
      { plan: 'pro', price: 299900, currency: 'INR' },
      { plan: 'agency', price: 799900, currency: 'INR' },
    ])
  })

  fastify.post<{ Body: { plan: string } }>(
    '/subscribe',
    { preHandler: [requireOrg] },
    async (_req, reply) => {
      // TODO: Create Razorpay subscription
      return reply.status(501).send({ message: 'Not implemented yet' })
    }
  )
}
