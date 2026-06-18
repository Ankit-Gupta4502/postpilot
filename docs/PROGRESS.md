# PostPilot — Build Progress

_Last updated: 2026-06-18_

## Legend
- [x] Done — scaffolded / implemented
- [ ] TODO — not yet implemented
- [~] Partial — stub exists, needs completion

---

## Phase 1: Monorepo Scaffold ✅

- [x] Root package.json with pnpm workspaces
- [x] turbo.json pipeline config
- [x] Base tsconfig.json
- [x] .gitignore, .env.example, prettier.config.js

---

## Phase 2: packages/db — Database Schemas ✅

All Drizzle ORM schemas implemented from ARCHITECTURE.md:

### Auth (Better Auth managed)
- [x] users
- [x] sessions
- [x] accounts
- [x] verifications

### Organization & Teams
- [x] organizations (plan, plan_status, grace_until, plan_checked_at)
- [x] org_members (owner|admin|billing|member roles)
- [x] org_invites (token_hash, workspace_grants, expires_at)
- [x] plan_limits (max_accounts, max_workspaces, features jsonb)

### Workspaces
- [x] workspaces
- [x] workspace_members (admin|editor|approver|viewer roles)

### Social
- [x] oauth_states (PKCE, single-use, expires)
- [x] social_accounts (health_status, analytics_sync_priority, scopes[])

### Posts & Publishing
- [x] posts (scheduled_for_utc + scheduled_timezone for DST safety)
- [x] media (checksum for deduplication, status: uploading|ready|failed)
- [x] syndication_jobs (idempotency_key, lease columns for crash recovery)
- [x] platform_posts (unique on social_account_id + platform_post_id)
- [x] sync_state (checkpoint types)

### Billing (Razorpay)
- [x] billing_customers
- [x] subscriptions
- [x] orders
- [x] payments
- [x] refunds
- [x] webhook_events (idempotency via razorpay_event_id)

### Analytics
- [x] post_metric_snapshots (append-only, indexed on post+time)

### System
- [x] dead_letter_jobs
- [x] audit_log
- [x] email_events (Resend delivery tracking)

---

## Phase 3: packages/shared ✅

- [x] Type definitions (Platform, OrgPlan, PlanStatus, roles, etc.)
- [x] PLAN_LIMITS constant map
- [x] QUEUE_NAMES, ANALYTICS_CADENCE_HOURS
- [x] Utility functions (generateIdempotencyKey, toSlug, hashToken, generateSecureToken)

---

## Phase 4: packages/ui ✅

- [x] Tailwind v4 globals.css with CSS-first theme (oklch colors)
- [x] Button component (cva variants)
- [x] Input component
- [x] Card, CardHeader, CardContent, CardFooter
- [x] Badge component

---

## Phase 5: apps/api — Fastify API ✅ (skeleton)

- [x] Fastify v5 server with CORS, cookie plugins
- [x] Better Auth integration (Google OAuth, session middleware)
- [x] Auth hook: userId, orgId, orgRole on every request
- [x] requireAuth / requireOrg middleware
- [x] /api/orgs — list, create, get
- [x] /api/workspaces — list, create
- [x] /api/social-accounts — list, OAuth initiation
- [x] /api/posts — list, create (draft + scheduled)
- [x] /api/billing — plans list, subscribe stub
- [x] /api/webhooks — Razorpay (sig verify), Meta (challenge handshake)

---

## Phase 6: apps/web — TanStack Start Frontend ✅ (skeleton)

- [x] TanStack Start + Vinxi setup
- [x] @tailwindcss/vite integration
- [x] TanStack Router file-based routes
- [x] Root layout with Meta/Scripts
- [x] Routes: / (landing), /login, /dashboard
- [x] Better Auth client (authClient with Google sign-in)
- [x] apiFetch helper with X-Org-Id header support

---

## Phase 7: apps/queue-worker ✅ (skeleton)

- [x] Cloudflare Queues HTTP Pull API consumer loop
- [x] Multi-queue polling (publish, sync, analytics, webhook)
- [x] At-least-once + ack/retry per message
- [x] publishHandler — idempotent, lease-aware, immediate platform_posts upsert
- [x] syncPostsHandler stub
- [x] analyticsHandler stub
- [x] webhookHandler stub

---

## Phase 8: apps/scheduler ✅ (skeleton)

- [x] node-cron driven scheduler
- [x] scheduledPublishJob — posts due now → status=publishing
- [x] planReconciliationJob — past_due grace elapsed → free/expired
- [x] tokenRefreshJob — expiring tokens
- [x] leaseRecoveryJob — reclaims stuck running jobs (§24)
- [x] analyticsSchedulerJob — adaptive hot/warm/cold cadence (§23)

---

## Next Up — Implementation TODOs

### High Priority
- [ ] Platform adapters (Instagram, Facebook, LinkedIn, X, YouTube)
  - [ ] connect() — OAuth token exchange
  - [ ] publish() — idempotent post creation
  - [ ] syncPosts() — paginated import with checkpoint
  - [ ] syncAnalytics() — fetch metrics, insert snapshots
  - [ ] refreshToken() — token rotation
  - [ ] handleWebhook() — signature verify + event routing
- [ ] Token encryption at rest (ENCRYPTION_KEY, AES-256-GCM)
- [ ] Plan limit enforcement middleware (§16.3 — pre-action gate)
- [ ] Queue publishing via CF API (actually enqueue to Cloudflare)

### Medium Priority
- [ ] Full Razorpay billing flow (create subscription, webhook state machine)
- [ ] Org invite flow (send email via Resend, accept endpoint)
- [ ] Media upload to R2 (multipart + SHA-256 dedup)
- [ ] Analytics dashboard routes (charts from post_metric_snapshots)
- [ ] Post composer UI (multi-platform, media attach, timezone picker)
- [ ] Social accounts management UI
- [ ] Workspace management UI

### Lower Priority
- [ ] Backfill queue + handler (import full post history)
- [ ] Admin DLQ interface (replay/discard dead_letter_jobs)
- [ ] White-label subdomain routing (Agency plan)
- [ ] Approval workflow (approver role, post approval state)
- [ ] Rate limiting per social_account_id via KV (§12)
- [ ] Sentry error tracking integration
- [ ] E2E tests (Playwright)

---

## Architecture Reference

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design (v4).

Key design decisions baked in:
- **Idempotent publishing** — idempotency_key + published_post_id reconciliation prevents double-posts on retry
- **Immediate dashboard sync** — on publish success, platform_posts upsert happens before queue ack (§21)
- **Crash recovery** — lease_expires_at columns + 5-min recovery cron (§24)
- **Adaptive analytics** — hot/warm/cold sync cadence reduces API calls 80-95% (§23)
- **Pull-based queue** — Fastify worker pulls from CF Queues, no Cloudflare Workers runtime (§31)
- **One plan_status flag** — two writers (webhook + daily cron), one reader (middleware) (§18)
