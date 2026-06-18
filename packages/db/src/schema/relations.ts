import { relations } from 'drizzle-orm'
import { organizations, orgMembers } from './organizations'
import { workspaces, workspaceMembers } from './workspaces'
import { socialAccounts } from './social'
import { posts, media, syndicationJobs, platformPosts, syncState } from './posts'
import { billingCustomers, subscriptions } from './billing'
import { users } from './auth'

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  workspaces: many(workspaces),
  socialAccounts: many(socialAccounts),
  subscriptions: many(subscriptions),
  billingCustomer: many(billingCustomers),
}))

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org: one(organizations, { fields: [orgMembers.orgId], references: [organizations.id] }),
  user: one(users, { fields: [orgMembers.userId], references: [users.id] }),
}))

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  org: one(organizations, { fields: [workspaces.orgId], references: [organizations.id] }),
  members: many(workspaceMembers),
  socialAccounts: many(socialAccounts),
  posts: many(posts),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}))

export const socialAccountsRelations = relations(socialAccounts, ({ one, many }) => ({
  org: one(organizations, { fields: [socialAccounts.orgId], references: [organizations.id] }),
  workspace: one(workspaces, { fields: [socialAccounts.workspaceId], references: [workspaces.id] }),
  syndicationJobs: many(syndicationJobs),
  platformPosts: many(platformPosts),
  syncStates: many(syncState),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  org: one(organizations, { fields: [posts.orgId], references: [organizations.id] }),
  workspace: one(workspaces, { fields: [posts.workspaceId], references: [workspaces.id] }),
  media: many(media),
  syndicationJobs: many(syndicationJobs),
}))

export const mediaRelations = relations(media, ({ one }) => ({
  post: one(posts, { fields: [media.postId], references: [posts.id] }),
}))

export const syndicationJobsRelations = relations(syndicationJobs, ({ one }) => ({
  post: one(posts, { fields: [syndicationJobs.postId], references: [posts.id] }),
  socialAccount: one(socialAccounts, { fields: [syndicationJobs.socialAccountId], references: [socialAccounts.id] }),
}))

export const platformPostsRelations = relations(platformPosts, ({ one }) => ({
  socialAccount: one(socialAccounts, { fields: [platformPosts.socialAccountId], references: [socialAccounts.id] }),
}))

export const syncStateRelations = relations(syncState, ({ one }) => ({
  socialAccount: one(socialAccounts, { fields: [syncState.socialAccountId], references: [socialAccounts.id] }),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  org: one(organizations, { fields: [subscriptions.orgId], references: [organizations.id] }),
}))

export const billingCustomersRelations = relations(billingCustomers, ({ one }) => ({
  org: one(organizations, { fields: [billingCustomers.orgId], references: [organizations.id] }),
}))
