export const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'youtube'] as const

export const QUEUE_NAMES = {
  PUBLISH: 'publish_queue',
  SCHEDULED_PUBLISH: 'scheduled_publish_queue',
  SYNC_POSTS: 'sync_posts_queue',
  ANALYTICS: 'analytics_queue',
  TOKEN_REFRESH: 'token_refresh_queue',
  WEBHOOK: 'webhook_queue',
  BACKFILL: 'backfill_queue',
} as const

export const ANALYTICS_CADENCE_HOURS = {
  hot: 6,
  warm: 24,
  cold: 24 * 7,
} as const

export const JOB_LEASE_MINUTES = 15

export const OAUTH_STATE_EXPIRY_MINUTES = 10

export const INVITE_EXPIRY_DAYS = 7

export const MAX_RETRY_ATTEMPTS = 3

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYMENT_REQUIRED: 402,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
} as const

export const ERROR_CODES = {
  PLAN_LIMIT: 'PLAN_LIMIT',
  PLAN_INACTIVE: 'PLAN_INACTIVE',
  FEATURE_LOCKED: 'FEATURE_LOCKED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE: 'DUPLICATE',
} as const
