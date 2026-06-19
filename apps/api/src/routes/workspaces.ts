import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { checkWorkspaceLimit } from '../middleware/plan-gate'
import { ok, created, noContent, fail } from '../lib/response'

export const workspacesRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [requireOrg] }, async (req, reply) => {
    const members = await db.query.workspaceMembers.findMany({
      where: and(
        eq(schema.workspaceMembers.orgId, req.orgId!),
        eq(schema.workspaceMembers.userId, req.userId!)
      ),
      with: { workspace: true },
    })
    return ok(reply, { data: members.map((m) => ({ ...m.workspace, role: m.role })), message: 'Workspaces retrieved' })
  })

  fastify.post<{ Body: { name: string } }>(
    '/',
    { preHandler: [requireOrg, checkWorkspaceLimit] },
    async (req, reply) => {
      const { name } = req.body

      const workspace = await db.transaction(async (tx) => {
        const [ws] = await tx.insert(schema.workspaces).values({
          orgId: req.orgId!,
          name,
          createdBy: req.userId!,
        }).returning()

        await tx.insert(schema.workspaceMembers).values({
          workspaceId: ws!.id,
          orgId: req.orgId!,
          userId: req.userId!,
          role: 'admin',
        })

        return ws
      })

      return created(reply, { data: workspace, message: 'Workspace created' })
    }
  )

  fastify.patch<{ Params: { workspaceId: string }; Body: { name: string } }>(
    '/:workspaceId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { name } = req.body
      if (!name?.trim()) return fail(reply, { status: 400, code: 'INVALID_NAME', message: 'Name cannot be empty' })

      const member = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(schema.workspaceMembers.workspaceId, req.params.workspaceId),
          eq(schema.workspaceMembers.userId, req.userId!),
          eq(schema.workspaceMembers.orgId, req.orgId!)
        ),
        columns: { role: true },
      })
      const orgRole = req.orgRole
      const canEdit = orgRole === 'owner' || orgRole === 'admin' || member?.role === 'admin'
      if (!canEdit) return fail(reply, { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' })

      const [updated] = await db.update(schema.workspaces)
        .set({ name: name.trim(), updatedAt: new Date() })
        .where(and(
          eq(schema.workspaces.id, req.params.workspaceId),
          eq(schema.workspaces.orgId, req.orgId!)
        ))
        .returning()

      return ok(reply, { data: updated, message: 'Workspace updated' })
    }
  )

  fastify.get<{ Params: { workspaceId: string } }>(
    '/:workspaceId/members',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const members = await db.query.workspaceMembers.findMany({
        where: and(
          eq(schema.workspaceMembers.workspaceId, req.params.workspaceId),
          eq(schema.workspaceMembers.orgId, req.orgId!)
        ),
        with: { user: true },
      })
      return ok(reply, {
        data: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt,
          user: { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image },
        })),
        message: 'Members retrieved',
      })
    }
  )

  fastify.post<{
    Params: { workspaceId: string }
    Body: { userId: string; role: 'admin' | 'editor' | 'approver' | 'viewer' }
  }>(
    '/:workspaceId/members',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { userId, role } = req.body

      const orgMember = await db.query.orgMembers.findFirst({
        where: and(
          eq(schema.orgMembers.orgId, req.orgId!),
          eq(schema.orgMembers.userId, userId),
          eq(schema.orgMembers.status, 'active')
        ),
      })
      if (!orgMember) {
        return fail(reply, { status: 400, code: 'NOT_ORG_MEMBER', message: 'User is not a member of this org' })
      }

      const [member] = await db.insert(schema.workspaceMembers)
        .values({ workspaceId: req.params.workspaceId, orgId: req.orgId!, userId, role })
        .onConflictDoUpdate({
          target: [schema.workspaceMembers.workspaceId, schema.workspaceMembers.userId],
          set: { role },
        })
        .returning()

      return created(reply, { data: member, message: 'Member added' })
    }
  )

  fastify.delete<{ Params: { workspaceId: string; userId: string } }>(
    '/:workspaceId/members/:userId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      await db.delete(schema.workspaceMembers)
        .where(and(
          eq(schema.workspaceMembers.workspaceId, req.params.workspaceId),
          eq(schema.workspaceMembers.userId, req.params.userId),
          eq(schema.workspaceMembers.orgId, req.orgId!)
        ))
      return noContent(reply)
    }
  )
}
