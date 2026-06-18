export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'x' | 'youtube'
export type OrgPlan = 'free' | 'starter' | 'pro' | 'agency'
export type PlanStatus = 'active' | 'past_due' | 'cancelled' | 'expired'
export type OrgRole = 'owner' | 'admin' | 'billing' | 'member'
export type WorkspaceRole = 'admin' | 'editor' | 'approver' | 'viewer'
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'partial' | 'failed'
export type SocialAccountStatus = 'connected' | 'expired' | 'revoked' | 'paused' | 'error'
export type AccountHealth = 'healthy' | 'warning' | 'broken'
export type AnalyticsPriority = 'hot' | 'warm' | 'cold'

export interface PlanFeatures {
  teams: boolean
  approvals: boolean
  white_label: boolean
}

export interface PlanLimitRecord {
  maxAccounts: number
  maxWorkspaces: number | null
  maxMembers: number | null
  maxScheduled: number | null
  analyticsRetentionDays: number
  features: PlanFeatures
}

export const PLAN_LIMITS: Record<OrgPlan, PlanLimitRecord> = {
  free: {
    maxAccounts: 2,
    maxWorkspaces: 1,
    maxMembers: 1,
    maxScheduled: 50,
    analyticsRetentionDays: 7,
    features: { teams: false, approvals: false, white_label: false },
  },
  starter: {
    maxAccounts: 10,
    maxWorkspaces: 1,
    maxMembers: 3,
    maxScheduled: null,
    analyticsRetentionDays: 30,
    features: { teams: false, approvals: false, white_label: false },
  },
  pro: {
    maxAccounts: 25,
    maxWorkspaces: 1,
    maxMembers: 10,
    maxScheduled: null,
    analyticsRetentionDays: 90,
    features: { teams: true, approvals: false, white_label: false },
  },
  agency: {
    maxAccounts: 100,
    maxWorkspaces: null,
    maxMembers: null,
    maxScheduled: null,
    analyticsRetentionDays: 365,
    features: { teams: true, approvals: true, white_label: true },
  },
}

export interface ApiError {
  code: string
  message: string
  limit?: number
  current?: number
  plan?: OrgPlan
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
