import type { FastifyPluginAsync } from 'fastify'
import crypto from 'node:crypto'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { putObject } from '../lib/r2'
import { ok, created, fail } from '../lib/response'

export const mediaRouter: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Querystring: { postId?: string; mimeType?: string } }>(
    '/upload',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const orgId = req.orgId!
      const { postId } = req.query

      const data = await req.file()
      if (!data) {
        return fail(reply, { status: 400, code: 'VALIDATION_ERROR', message: 'No file in request' })
      }

      const MAX_BYTES = 50 * 1024 * 1024
      const chunks: Uint8Array[] = []
      let total = 0
      for await (const chunk of data.file) {
        total += chunk.length
        if (total > MAX_BYTES) {
          return fail(reply, { status: 413, code: 'FILE_TOO_LARGE', message: 'File exceeds 50 MB limit' })
        }
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)
      const mimeType = data.mimetype || (req.query.mimeType ?? 'application/octet-stream')

      const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

      const existing = await db.query.media.findFirst({
        where: and(
          eq(schema.media.orgId, orgId),
          eq(schema.media.checksum, checksum),
          eq(schema.media.status, 'ready')
        ),
      })

      if (existing) {
        const url = `${process.env['R2_PUBLIC_BASE_URL'] ?? ''}/${existing.r2Key}`
        if (postId && existing.postId !== postId) {
          await db.update(schema.media).set({ postId }).where(eq(schema.media.id, existing.id))
        }
        return ok(reply, {
          data: { mediaId: existing.id, url, mimeType: existing.mimeType, checksum, deduped: true },
          message: 'Existing media reused',
        })
      }

      const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const r2Key = `${orgId}/${ym}/${checksum}.${ext}`

      const [mediaRow] = await db.insert(schema.media).values({
        orgId,
        postId: postId ?? null,
        r2Key,
        mimeType,
        size: buffer.length,
        checksum,
        status: 'uploading',
      }).returning()

      if (!mediaRow) {
        return fail(reply, { status: 500, code: 'INTERNAL', message: 'Failed to create media record' })
      }

      try {
        const url = await putObject(r2Key, buffer, mimeType)
        await db.update(schema.media).set({ status: 'ready' }).where(eq(schema.media.id, mediaRow.id))
        return created(reply, {
          data: { mediaId: mediaRow.id, url, mimeType, checksum, deduped: false },
          message: 'Media uploaded',
        })
      } catch (err) {
        await db.update(schema.media).set({ status: 'failed' }).where(eq(schema.media.id, mediaRow.id))
        fastify.log.error({ err, r2Key }, 'R2 upload failed')
        return fail(reply, { status: 500, code: 'UPLOAD_FAILED', message: 'Upload to storage failed' })
      }
    }
  )

  fastify.get<{ Params: { mediaId: string } }>(
    '/:mediaId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const media = await db.query.media.findFirst({
        where: and(
          eq(schema.media.id, req.params.mediaId),
          eq(schema.media.orgId, req.orgId!)
        ),
      })
      if (!media) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Media not found' })
      const url = `${process.env['R2_PUBLIC_BASE_URL'] ?? ''}/${media.r2Key}`
      return ok(reply, { data: { ...media, url }, message: 'Media retrieved' })
    }
  )
}
