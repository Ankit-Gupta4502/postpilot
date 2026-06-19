import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '@postpilot/db'
import { eq, and } from 'drizzle-orm'
import { requireOrg } from '../middleware/require-auth'
import { checkWorkspaceLimit } from '../middleware/plan-gate'

export const workspacesRouter: FastifyPluginAsync = async (fastify) => {
  // List workspaces for current user in the active org
  fastify.get('/', { preHandler: [requireOrg] }, async (req, reply) => {
    const members = await db.query.workspaceMembers.findMany({
      where: and(
        eq(schema.workspaceMembers.orgId, req.orgId!),
        eq(schema.workspaceMembers.userId, req.userId!)
      ),
      with: { workspace: true },
    })
    return reply.send(members.map((m) => ({ ...m.workspace, role: m.role })))
  })

  // Create workspace
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

        // Creator becomes workspace admin
        await tx.insert(schema.workspaceMembers).values({
          workspaceId: ws!.id,
          orgId: req.orgId!,
          userId: req.userId!,
          role: 'admin',
        })

        return ws
      })

      return reply.status(201).send(workspace)
    }
  )

  // Rename workspace (workspace admin or org admin/owner)
  fastify.patch<{ Params: { workspaceId: string }; Body: { name: string } }>(
    '/:workspaceId',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { name } = req.body
      if (!name?.trim()) return reply.status(400).send({ code: 'INVALID_NAME' })

      const member = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(schema.workspaceMembers.workspaceId, req.params.workspaceId),
          eq(schema.workspaceMembers.userId, req.userId!),
          eq(schema.workspaceMembers.orgId, req.orgId!)
        ),
        columns: { role: true },
      })
      const orgRole = req.orgRole
      const canEdit =
        orgRole === 'owner' || orgRole === 'admin' ||
        member?.role === 'admin'
      if (!canEdit) return reply.status(403).send({ code: 'FORBIDDEN' })

      const [updated] = await db.update(schema.workspaces)
        .set({ name: name.trim(), updatedAt: new Date() })
        .where(and(
          eq(schema.workspaces.id, req.params.workspaceId),
          eq(schema.workspaces.orgId, req.orgId!)
        ))
        .returning()

      return reply.send(updated)
    }
  )

  // Get workspace members
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
      return reply.send(
        members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt,
          user: { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image },
        }))
      )
    }
  )

  // Add workspace member (workspace admin or org admin/owner)
  fastify.post<{
    Params: { workspaceId: string }
    Body: { userId: string; role: 'admin' | 'editor' | 'approver' | 'viewer' }
  }>(
    '/:workspaceId/members',
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const { userId, role } = req.body

      // Ensure target is an org member
      const orgMember = await db.query.orgMembers.findFirst({
        where: and(
          eq(schema.orgMembers.orgId, req.orgId!),
          eq(schema.orgMembers.userId, userId),
          eq(schema.orgMembers.status, 'active')
        ),
      })
      if (!orgMember) {
        return reply.status(400).send({ code: 'NOT_ORG_MEMBER', message: 'User is not a member of this org' })
      }

      const [member] = await db.insert(schema.workspaceMembers)
        .values({ workspaceId: req.params.workspaceId, orgId: req.orgId!, userId, role })
        .onConflictDoUpdate({
          target: [schema.workspaceMembers.workspaceId, schema.workspaceMembers.userId],
          set: { role },
        })
        .returning()

      return reply.status(201).send(member)
    }
  )

  // Remove workspace member
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
      return reply.status(204).send()
    }
  )
}
