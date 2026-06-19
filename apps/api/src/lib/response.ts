import type { FastifyReply } from 'fastify'

// ── Success helpers ────────────────────────────────────────────────────────────

interface OkOptions {
  data: unknown
  message?: string
}

export function ok(reply: FastifyReply, opts: OkOptions) {
  return reply.status(200).send({ status: 'success', message: opts.message ?? 'OK', data: opts.data })
}

export function created(reply: FastifyReply, opts: OkOptions) {
  return reply.status(201).send({ status: 'success', message: opts.message ?? 'Created', data: opts.data })
}

export function accepted(reply: FastifyReply, opts: OkOptions) {
  return reply.status(202).send({ status: 'success', message: opts.message ?? 'Accepted', data: opts.data })
}

export function noContent(reply: FastifyReply) {
  return reply.status(204).send()
}

// ── Error helper ───────────────────────────────────────────────────────────────

interface FailOptions {
  status: number
  code: string
  message: string
  extra?: Record<string, unknown>
}

export function fail(reply: FastifyReply, opts: FailOptions) {
  return reply.status(opts.status).send({
    status: 'error',
    code: opts.code,
    message: opts.message,
    ...opts.extra,
  })
}
