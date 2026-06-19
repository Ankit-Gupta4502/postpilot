import type { FastifyPluginAsync } from 'fastify'
import { Resend } from 'resend'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg, requireAuth } from '../middleware/require-auth'
import { checkMemberLimit } from '../middleware/plan-gate'
import { generateSecureToken, hashToken } from '@postpilot/shared'
import { INVITE_EXPIRY_DAYS } from '@postpilot/shared'
import { ok, created, noContent, fail } from '../lib/response'

let _resend: Resend | null = null

function getResend(): Resend | null {
  const key = process.env['RESEND_API_KEY']
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

const FROM = process.env['EMAIL_FROM'] ?? 'no-reply@postpilot.app'
const APP_BASE_URL = () => process.env['APP_BASE_URL'] ?? 'http://localhost:3000'

interface WorkspaceGrant {
  workspaceId: string
  role: 'admin' | 'editor' | 'approver' | 'viewer'
}

export const invitesRouter: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: { email: string; role: 'admin' | 'billing' | 'member'; workspaceGrants?: WorkspaceGrant[] }
  }>(
    '/',
    { preHandler: [requireOrg, checkMemberLimit] },
    async (req, reply) => {
      const { email, role, workspaceGrants } = req.body
      const orgId = req.orgId!

      if (!['owner', 'admin'].includes(req.orgRole ?? '')) {
        return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Only org admins can invite members' })
      }

      const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) })
      if (!org) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Organization not found' })

      const existing = await db.query.orgInvites.findFirst({
        where: and(
          eq(schema.orgInvites.orgId, orgId),
          eq(schema.orgInvites.email, email.toLowerCase()),
          eq(schema.orgInvites.status, 'pending')
        ),
      })
      if (existing) {
        return fail(reply, { status: 409, code: 'DUPLICATE', message: 'An active invite already exists for this email' })
      }

      const rawToken = await generateSecureToken()
      const tokenHash = await hashToken(rawToken)
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

      const [invite] = await db.insert(schema.orgInvites).values({
        orgId,
        email: email.toLowerCase(),
        role,
        workspaceGrants: workspaceGrants ?? null,
        tokenHash,
        invitedBy: req.userId!,
        expiresAt,
      }).returning()

      if (!invite) return fail(reply, { status: 500, code: 'INTERNAL', message: 'Failed to create invite' })

      const acceptUrl = `${APP_BASE_URL()}/invite/accept?token=${rawToken}`

      const client = getResend()
      let emailData: { id?: string } | null = null
      let emailError: unknown = null

      if (!client) {
        fastify.log.warn('RESEND_API_KEY is not configured — invite email not sent')
      } else {
        const result = await client.emails.send({
          from: FROM,
          to: email,
          subject: `You've been invited to join ${org.name} on PostPilot`,
          html: buildInviteEmailHtml({ orgName: org.name, role, acceptUrl, expiryDays: INVITE_EXPIRY_DAYS }),
        })
        emailData = result.data
        emailError = result.error
      }

      await db.insert(schema.emailEvents).values({
        orgId,
        recipient: email.toLowerCase(),
        template: 'org_invite',
        status: !client ? 'failed' : emailError ? 'failed' : 'sent',
        providerMessageId: emailData?.id ?? null,
      }).catch(() => {})

      if (emailError) {
        fastify.log.error({ emailError }, 'Failed to send invite email')
        return created(reply, { data: { invite, emailSent: false }, message: 'Invite created (email delivery failed)' })
      }

      await db.insert(schema.auditLog).values({
        orgId,
        actorUser: req.userId!,
        action: 'member.invite',
        targetType: 'org_invite',
        targetId: invite.id,
        metadata: JSON.stringify({ email, role }),
      }).catch(() => {})

      return created(reply, { data: { invite, emailSent: true }, message: 'Invite sent' })
    }
  )

  fastify.post<{ Body: { token: string } }>(
    '/accept',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { token } = req.body
      const tokenHash = await hashToken(token)

      const invite = await db.query.orgInvites.findFirst({
        where: and(
          eq(schema.orgInvites.tokenHash, tokenHash),
          eq(schema.orgInvites.status, 'pending')
        ),
      })

      if (!invite) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Invite not found or already used' })
      if (invite.expiresAt < new Date()) {
        await db.update(schema.orgInvites).set({ status: 'expired' }).where(eq(schema.orgInvites.id, invite.id))
        return fail(reply, { status: 410, code: 'INVITE_EXPIRED', message: 'This invite has expired' })
      }

      const userId = req.userId!

      const existingMember = await db.query.orgMembers.findFirst({
        where: and(
          eq(schema.orgMembers.orgId, invite.orgId),
          eq(schema.orgMembers.userId, userId)
        ),
      })

      await db.transaction(async (tx) => {
        if (!existingMember) {
          await tx.insert(schema.orgMembers).values({
            orgId: invite.orgId,
            userId,
            role: invite.role,
            invitedBy: invite.invitedBy,
            joinedAt: new Date(),
          })
        }

        const grants = (invite.workspaceGrants ?? []) as WorkspaceGrant[]
        for (const grant of grants) {
          await tx.insert(schema.workspaceMembers)
            .values({ workspaceId: grant.workspaceId, orgId: invite.orgId, userId, role: grant.role })
            .onConflictDoNothing()
        }

        await tx.update(schema.orgInvites)
          .set({ status: 'accepted', acceptedBy: userId })
          .where(eq(schema.orgInvites.id, invite.id))
      })

      await db.insert(schema.auditLog).values({
        orgId: invite.orgId,
        actorUser: userId,
        action: 'member.invite_accepted',
        targetType: 'org_invite',
        targetId: invite.id,
        metadata: JSON.stringify({ email: invite.email }),
      }).catch(() => {})

      return ok(reply, { data: { orgId: invite.orgId, role: invite.role }, message: 'Invite accepted' })
    }
  )

  fastify.delete<{ Params: { inviteId: string } }>(
    '/:inviteId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      if (!['owner', 'admin'].includes(req.orgRole ?? '')) {
        return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Admin or owner required' })
      }

      const invite = await db.query.orgInvites.findFirst({
        where: and(
          eq(schema.orgInvites.id, req.params.inviteId),
          eq(schema.orgInvites.orgId, req.orgId!),
          eq(schema.orgInvites.status, 'pending')
        ),
      })
      if (!invite) return fail(reply, { status: 404, code: 'NOT_FOUND', message: 'Invite not found' })

      await db.update(schema.orgInvites).set({ status: 'revoked' }).where(eq(schema.orgInvites.id, invite.id))

      return noContent(reply)
    }
  )
}

function buildInviteEmailHtml(opts: { orgName: string; role: string; acceptUrl: string; expiryDays: number }): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h2 style="margin-bottom: 8px;">You've been invited to join <strong>${opts.orgName}</strong></h2>
  <p style="color: #555; margin-bottom: 24px;">
    You've been invited as a <strong>${opts.role}</strong>. This invite expires in ${opts.expiryDays} days.
  </p>
  <a href="${opts.acceptUrl}"
     style="display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff;
            text-decoration: none; border-radius: 6px; font-weight: 600;">
    Accept Invite
  </a>
  <p style="margin-top: 32px; font-size: 13px; color: #888;">
    Or copy this link into your browser:<br>
    <a href="${opts.acceptUrl}" style="color: #6366f1;">${opts.acceptUrl}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #aaa;">PostPilot — Social media scheduling for teams</p>
</body>
</html>`
}
