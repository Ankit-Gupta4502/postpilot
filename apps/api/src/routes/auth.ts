import type { FastifyPluginAsync } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth'
import { fail } from '../lib/response'

export const authRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { callbackURL?: string } }>('/google', async (req, reply) => {
    const callbackURL = req.query.callbackURL ?? process.env['APP_BASE_URL'] ?? 'http://localhost:5173'

    const { response, headers } = await auth.api.signInSocial({
      body: { provider: 'google', callbackURL },
      headers: fromNodeHeaders(req.raw.headers),
      returnHeaders: true,
    })

    if (!response?.url) {
      return fail(reply, { status: 500, code: 'GOOGLE_URL_ERROR', message: 'Failed to generate Google sign-in URL' })
    }

    // Forward state cookies set by better-auth so the callback can verify them
    const setCookies = typeof headers?.getSetCookie === 'function'
      ? headers.getSetCookie()
      : []
    for (const cookie of setCookies) {
      reply.header('set-cookie', cookie)
    }

    return reply.send({ status: 'success', message: 'OK', data: { url: response.url } })
  })
}
