import type { FastifyPluginAsync } from 'fastify'
import crypto from 'node:crypto'

export const webhooksRouter: FastifyPluginAsync = async (fastify) => {
  // Razorpay webhooks
  fastify.post('/razorpay', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const signature = req.headers['x-razorpay-signature'] as string
    const secret = process.env['RAZORPAY_WEBHOOK_SECRET']!
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex')

    if (signature !== expected) {
      return reply.status(400).send({ error: 'Invalid signature' })
    }

    // TODO: Process Razorpay events
    return reply.send({ received: true })
  })

  // Meta (Instagram/Facebook) webhooks
  fastify.get('/meta', async (req: any, reply) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === process.env['META_WEBHOOK_VERIFY_TOKEN']) {
      return reply.send(challenge)
    }
    return reply.status(403).send({ error: 'Forbidden' })
  })

  fastify.post('/meta', async (_req, reply) => {
    // TODO: Verify Meta signature and process events
    return reply.send({ received: true })
  })
}
