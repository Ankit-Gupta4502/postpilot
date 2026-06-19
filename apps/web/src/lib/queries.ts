/**
 * Central query registry.
 *
 * Every TanStack Query definition lives here.
 * - `queryKeys`  — stable key factories; use for invalidateQueries / prefetch
 * - `queries`    — full query option objects; pass directly to useQuery
 *
 * Adding a new endpoint? Add the type, key, and query here — then consume
 * via `useQuery(queries.foo(...))`. Never inline queryKey strings in routes.
 */

import { apiFetch } from './api'

// ─── Shared response types ────────────────────────────────────────────────────

export interface SocialAccount {
  id: string
  platform: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  status: string
  healthStatus: string
  lastErrorMessage: string | null
}

export interface Post {
  id: string
  status: string
  content?: string | null
  scheduledForUtc?: string | null
  createdAt?: string | null
}

export interface PlatformPost {
  id: string
  platformPostId: string
  content: string | null
  publishedAt: string | null
  likesCount: number | null
  commentsCount: number | null
  sharesCount: number | null
  viewsCount: number | null
}

export interface MetricSnapshot {
  id: string
  platformPostId: string
  likes: number | null
  comments: number | null
  shares: number | null
  views: number | null
  reach: number | null
  capturedAt: string
}

export interface AnalyticsSummary {
  accountId: string
  platform: string
  username: string | null
  analyticsSyncPriority: string | null
  lastAnalyticsSyncAt: string | null
  totalPosts: number
  latestSnapshot: MetricSnapshot | null
}

export interface OrgMember {
  id: string
  userId: string
  role: string
  joinedAt: string | null
  user: { id: string; name: string; email: string; image: string | null }
}

export interface OrgInvite {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string | null
}

export interface BillingPlan {
  plan: string
  price: number
  currency: string
  features: { teams: boolean; approvals: boolean }
}

export interface DeadLetterJob {
  id: string
  sourceQueue: string
  failureReason: string | null
  attempts: number | null
  firstFailedAt: string | null
  lastFailedAt: string | null
  replayedAt: string | null
  status: 'open' | 'replayed' | 'discarded'
  payload: unknown
}

export interface WorkspaceMember {
  id: string
  userId: string
  role: string
  createdAt: string | null
  user: { id: string; name: string; email: string; image: string | null }
}

// ─── Query keys (stable — use for invalidation) ───────────────────────────────

export const queryKeys = {
  socialAccounts: (workspaceId?: string) =>
    workspaceId ? (['social-accounts', workspaceId] as const) : (['social-accounts'] as const),

  posts: (workspaceId?: string) =>
    workspaceId ? (['posts', workspaceId] as const) : (['posts'] as const),

  workspaces: (orgId?: string) =>
    orgId ? (['workspaces', orgId] as const) : (['workspaces'] as const),

  orgMembers: (orgId?: string) =>
    orgId ? (['org-members', orgId] as const) : (['org-members'] as const),

  orgInvites: (orgId?: string) =>
    orgId ? (['org-invites', orgId] as const) : (['org-invites'] as const),

  analyticsSnapshots: (socialAccountId?: string) =>
    socialAccountId
      ? (['analytics-snapshots', socialAccountId] as const)
      : (['analytics-snapshots'] as const),

  analyticsPosts: (socialAccountId?: string) =>
    socialAccountId
      ? (['analytics-posts', socialAccountId] as const)
      : (['analytics-posts'] as const),

  analyticsSummary: (socialAccountId?: string) =>
    socialAccountId
      ? (['analytics-summary', socialAccountId] as const)
      : (['analytics-summary'] as const),

  billingPlans: () => ['billing-plans'] as const,

  dlq: (status?: string, orgId?: string) =>
    ['dlq', status, orgId] as const,

  workspaceMembers: (workspaceId?: string) =>
    workspaceId
      ? (['workspace-members', workspaceId] as const)
      : (['workspace-members'] as const),
} as const

// ─── Query factories (pass directly to useQuery) ──────────────────────────────

export const queries = {
  socialAccounts: (workspaceId: string, orgId: string) => ({
    queryKey: queryKeys.socialAccounts(workspaceId),
    queryFn: () =>
      apiFetch<SocialAccount[]>(`/api/social-accounts/${workspaceId}`, { orgId }),
    enabled: !!workspaceId && !!orgId,
  }),

  posts: (workspaceId: string, orgId: string) => ({
    queryKey: queryKeys.posts(workspaceId),
    queryFn: () =>
      apiFetch<Post[]>(`/api/posts?workspaceId=${workspaceId}`, { orgId }),
    enabled: !!workspaceId && !!orgId,
  }),

  workspaces: (orgId: string) => ({
    queryKey: queryKeys.workspaces(orgId),
    queryFn: () => apiFetch<Array<{ id: string; name: string; orgId: string; role: string }>>('/api/workspaces', { orgId }),
    enabled: !!orgId,
  }),

  orgMembers: (orgId: string) => ({
    queryKey: queryKeys.orgMembers(orgId),
    queryFn: () => apiFetch<OrgMember[]>('/api/orgs/members', { orgId }),
    enabled: !!orgId,
  }),

  orgInvites: (orgId: string) => ({
    queryKey: queryKeys.orgInvites(orgId),
    queryFn: () => apiFetch<OrgInvite[]>('/api/orgs/invites', { orgId }),
    enabled: !!orgId,
  }),

  analyticsSummary: (socialAccountId: string, orgId: string) => ({
    queryKey: queryKeys.analyticsSummary(socialAccountId),
    queryFn: () =>
      apiFetch<AnalyticsSummary>(`/api/analytics/${socialAccountId}/summary`, { orgId }),
    enabled: !!socialAccountId && !!orgId,
  }),

  analyticsPosts: (socialAccountId: string, orgId: string) => ({
    queryKey: queryKeys.analyticsPosts(socialAccountId),
    queryFn: () =>
      apiFetch<{ posts: PlatformPost[] }>(`/api/analytics/${socialAccountId}/posts`, { orgId }),
    enabled: !!socialAccountId && !!orgId,
  }),

  analyticsSnapshots: (socialAccountId: string, orgId: string) => ({
    queryKey: queryKeys.analyticsSnapshots(socialAccountId),
    queryFn: () =>
      apiFetch<{ snapshots: MetricSnapshot[] }>(`/api/analytics/${socialAccountId}/snapshots`, { orgId }),
    enabled: !!socialAccountId && !!orgId,
  }),

  billingPlans: () => ({
    queryKey: queryKeys.billingPlans(),
    queryFn: () => apiFetch<BillingPlan[]>('/api/billing/plans'),
  }),

  dlq: (status: 'open' | 'replayed' | 'discarded', orgId: string) => ({
    queryKey: queryKeys.dlq(status, orgId),
    queryFn: () =>
      apiFetch<{ jobs: DeadLetterJob[] }>(`/api/admin/dlq?status=${status}`, { orgId }),
    enabled: !!orgId,
  }),

  workspaceMembers: (workspaceId: string, orgId: string) => ({
    queryKey: queryKeys.workspaceMembers(workspaceId),
    queryFn: () =>
      apiFetch<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`, { orgId }),
    enabled: !!workspaceId && !!orgId,
  }),
} as const
