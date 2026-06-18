import type { FastifyPluginAsync } from 'fastify'
import crypto from 'node:crypto'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { putObject } from '../lib/r2'

export const mediaRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/media/upload
   *
   * Multipart upload of a single media file.
   *
   * Flow:
   *   1. Stream multipart part into memory (max 50 MB)
   *   2. Compute SHA-256 checksum
   *   3. Dedup: look for existing media row with the same checksum for this org
   *      - found  → return existing media id and public URL (no upload)
   *      - missing → upload to R2, insert media row
   *   4. Return { mediaId, url, deduped }
   */
  fastify.post<{
    Querystring: { postId?: string; mimeType?: string }
  }>(
    '/upload',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const orgId = req.orgId!
      const { postId } = req.query

      const data = await req.file()
      if (!data) {
        return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'No file in request' })
      }

      // Stream into a Buffer (limit ~50 MB)
      const MAX_BYTES = 50 * 1024 * 1024
      const chunks: Uint8Array[] = []
      let total = 0
      for await (const chunk of data.file) {
        total += chunk.length
        if (total > MAX_BYTES) {
          return reply.status(413).send({ code: 'FILE_TOO_LARGE', message: 'File exceeds 50 MB limit' })
        }
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)
      const mimeType = data.mimetype || (req.query.mimeType ?? 'application/octet-stream')

      // SHA-256 checksum for deduplication
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

      // Dedup check: same org + same checksum
      const existing = await db.query.media.findFirst({
        where: and(
          eq(schema.media.orgId, orgId),
          eq(schema.media.checksum, checksum),
          eq(schema.media.status, 'ready')
        ),
      })

      if (existing) {
        // Reuse existing R2 key — no upload needed
        const url = `${process.env['R2_PUBLIC_BASE_URL'] ?? ''}/${existing.r2Key}`

        // If a postId was provided, ensure the media row is linked to the post
        if (postId && existing.postId !== postId) {
          await db.update(schema.media)
            .set({ postId })
            .where(eq(schema.media.id, existing.id))
        }

        return reply.send({
          mediaId: existing.id,
          url,
          mimeType: existing.mimeType,
          checksum,
          deduped: true,
        })
      }

      // New upload — derive a stable R2 key: org/YYYY-MM/checksum.ext
      const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const r2Key = `${orgId}/${ym}/${checksum}.${ext}`

      // Insert media row with status=uploading first (so crashes don't leave orphaned R2 objects)
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
        return reply.status(500).send({ code: 'INTERNAL' })
      }

      try {
        const url = await putObject(r2Key, buffer, mimeType)
        await db.update(schema.media)
          .set({ status: 'ready' })
          .where(eq(schema.media.id, mediaRow.id))

        return reply.status(201).send({
          mediaId: mediaRow.id,
          url,
          mimeType,
          checksum,
          deduped: false,
        })
      } catch (err) {
        await db.update(schema.media)
          .set({ status: 'failed' })
          .where(eq(schema.media.id, mediaRow.id))
        fastify.log.error({ err, r2Key }, 'R2 upload failed')
        return reply.status(500).send({ code: 'UPLOAD_FAILED', message: 'Upload to storage failed' })
      }
    }
  )

  /**
   * GET /api/media/:mediaId
   * Returns media metadata for a given media id (within the caller's org).
   */
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
      if (!media) return reply.status(404).send({ code: 'NOT_FOUND' })
      const url = `${process.env['R2_PUBLIC_BASE_URL'] ?? ''}/${media.r2Key}`
      return reply.send({ ...media, url })
    }
  )
}
