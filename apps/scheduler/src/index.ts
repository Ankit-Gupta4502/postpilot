import cron from 'node-cron'
import { scheduledPublishJob } from './jobs/scheduled-publish'
import { planReconciliationJob } from './jobs/plan-reconciliation'
import { tokenRefreshJob } from './jobs/token-refresh'
import { leaseRecoveryJob } from './jobs/lease-recovery'
import { analyticsSchedulerJob } from './jobs/analytics-scheduler'

console.log('PostPilot scheduler starting...')

const SCHEDULE_PUBLISH_CRON = '* * * * *'
const PLAN_EXPIRY_CRON = process.env['PLAN_EXPIRY_CRON'] ?? '15 0 * * *'
const TOKEN_REFRESH_CRON = process.env['TOKEN_REFRESH_CRON'] ?? '0 2 * * *'
const LEASE_RECOVERY_CRON = process.env['LEASE_RECOVERY_CRON'] ?? '*/5 * * * *'
const ANALYTICS_SCHEDULER_CRON = '0 */1 * * *'

cron.schedule(SCHEDULE_PUBLISH_CRON, () => {
  scheduledPublishJob().catch((e) => console.error('scheduledPublishJob error:', e))
})

cron.schedule(PLAN_EXPIRY_CRON, () => {
  planReconciliationJob().catch((e) => console.error('planReconciliationJob error:', e))
})

cron.schedule(TOKEN_REFRESH_CRON, () => {
  tokenRefreshJob().catch((e) => console.error('tokenRefreshJob error:', e))
})

cron.schedule(LEASE_RECOVERY_CRON, () => {
  leaseRecoveryJob().catch((e) => console.error('leaseRecoveryJob error:', e))
})

cron.schedule(ANALYTICS_SCHEDULER_CRON, () => {
  analyticsSchedulerJob().catch((e) => console.error('analyticsSchedulerJob error:', e))
})

console.log('All cron jobs scheduled.')
