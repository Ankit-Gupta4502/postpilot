# PostPilot — Build Progress

_Last updated: 2026-06-19 (Phase 15 complete)_

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

### Relations
- [x] Drizzle relations for all tables (enables `with:` clause in queries)

---

## Phase 3: packages/shared ✅

- [x] Type definitions (Platform, OrgPlan, PlanStatus, roles, etc.)
- [x] PLAN_LIMITS constant map
- [x] QUEUE_NAMES, ANALYTICS_CADENCE_HOURS
- [x] Utility functions (generateIdempotencyKey, toSlug, hashToken, generateSecureToken)
- [x] **Token encryption** — AES-256-GCM encrypt/decrypt (ENCRYPTION_KEY env var) (§11)

---

## Phase 4: packages/ui ✅

- [x] Tailwind v4 globals.css with CSS-first theme (oklch colors)
- [x] Button component (cva variants)
- [x] Input component
- [x] Card, CardHeader, CardContent, CardFooter
- [x] Badge component

---

## Phase 5: packages/adapters ✅ (NEW)

Platform adapter layer shared by `apps/api` and `apps/queue-worker`.

- [x] PlatformAdapter interface (connect, refreshToken, publish, syncPosts, syncAnalytics, disconnect, verifyWebhook, handleWebhook)
- [x] InstagramAdapter — OAuth exchange (short→long-lived token), publish, syncPosts, syncAnalytics, Meta webhook HMAC verify
- [x] FacebookAdapter — page token flow, feed publish, syncPosts, syncAnalytics, Meta webhook HMAC verify
- [x] LinkedInAdapter — OAuth2 + PKCE, ugcPosts publish, syncPosts, socialMetrics analytics
- [x] XAdapter — OAuth2 PKCE, tweet publish, syncPosts, public_metrics analytics
- [x] YouTubeAdapter — OAuth2 refresh, channel discovery, syncPosts (search API), video statistics
- [x] getAdapter() factory — singleton registry, throws on unknown platform

---

## Phase 6: apps/api — Fastify API ✅ (skeleton → real implementation)

- [x] Fastify v5 server with CORS, cookie, multipart plugins
- [x] Better Auth integration (Google OAuth, session middleware, Fetch API adapter)
- [x] Auth hook: userId, orgId, orgRole on every request
- [x] requireAuth / requireOrg middleware
- [x] /api/orgs — list, create, get
- [x] /api/workspaces — list, create
- [x] /api/social-accounts — list, OAuth initiation
- [x] **/oauth/:platform/callback** — full OAuth callback: validate state, exchange code, encrypt tokens, upsert social_accounts, enqueue initial sync (§6)
- [x] /api/posts — list, create (draft + scheduled)
- [x] **/api/media/upload** — multipart upload, SHA-256 dedup, R2 storage (§26)
- [x] **/api/media/:mediaId** — media metadata
- [x] /api/billing/plans — plan list
- [x] **/api/billing/subscribe** — Razorpay subscription creation (§17.3)
- [x] **/api/billing/subscriptions/:id/cancel** — subscription cancellation
- [x] **/api/billing/webhooks/razorpay** — full webhook state machine: sig verify, dedup, payment.captured/failed, subscription.activated/halted/cancelled/charged/expired (§17.5)
- [x] /api/webhooks — Meta challenge handshake
- [x] **/api/invites** — create invite (Resend email), accept invite (transaction: org_members + workspace_members), revoke invite (§3.2, §30)
- [x] Plan limit middleware — checkAccountLimit, checkMemberLimit pre-action gates (§16.3)
- [x] **CF Queues push client** — apps/api/src/lib/queue.ts enqueueMessage / enqueueBatch (§31)
- [x] **R2 client** — apps/api/src/lib/r2.ts putObject / deleteObject / presignPut

---

## Phase 7: apps/queue-worker ✅ (skeleton → real implementation)

- [x] Cloudflare Queues HTTP Pull API consumer loop
- [x] Multi-queue polling (publish, sync, analytics, webhook)
- [x] At-least-once + ack/retry per message
- [x] **publishHandler** — idempotent, lease-aware, media-gated, real adapter call, decrypt token, immediate platform_posts upsert (§5.5, §21, §24)
- [x] syncPostsHandler stub
- [x] analyticsHandler stub
- [x] webhookHandler stub

---

## Phase 8: apps/scheduler ✅ (skeleton → real implementation)

- [x] node-cron driven scheduler
- [x] scheduledPublishJob — posts due now → status=publishing
- [x] planReconciliationJob — past_due grace elapsed → free/expired
- [x] **tokenRefreshJob** — real adapter.refreshToken() + encrypt new token, update social_accounts, audit_log on failure (§11)
- [x] leaseRecoveryJob — reclaims stuck running jobs (§24)
- [x] analyticsSchedulerJob — adaptive hot/warm/cold cadence (§23)

---

## Phase 9: Core Handler & API Completions ✅ (NEW)

### Queue-Worker Handlers (real implementations)
- [x] **syncPostsHandler** — adapter.syncPosts() with checkpoint persistence (sync_state upsert), platform_posts upsert, health_status update on error (§7, §5.7)
- [x] **analyticsHandler** — adapter.syncAnalytics() per post, append-only post_metric_snapshots insert, platform_posts metrics update, per-post error isolation (§22)
- [x] **webhookHandler** — signature verify → adapter.handleWebhook() → route by event type (media.ready flips media status, Meta events logged with TODO for full processing) (§10, §28)

### Scheduler
- [x] **tokenRefreshJob** — real adapter.refreshToken() call, AES-256-GCM re-encrypt, health_status=broken + status=expired on failure, audit_log entry (§11)

### API Middleware
- [x] **checkWorkspaceLimit** — pre-action gate counting workspaces per org vs plan_limits.maxWorkspaces (§16.3)
- [x] Wired checkWorkspaceLimit as preHandler on POST /api/workspaces

### Billing (apps/api)
- [x] **POST /api/billing/orders** — one-off Razorpay order creation, receipt generation, orders table insert (§17.4)
- [x] **order.paid webhook handler** — update orders.status='paid', upgrade org plan if purpose='plan_upgrade', audit_log (§17.5)

### Analytics Dashboard Routes (apps/api)
- [x] **GET /api/analytics/:socialAccountId/snapshots** — time-filtered post_metric_snapshots with inArray + gte/lte (§22)
- [x] **GET /api/analytics/:socialAccountId/posts** — platform_posts for account, ordered by publishedAt DESC (§22)
- [x] **GET /api/analytics/:socialAccountId/summary** — account metadata + totalPosts + latestSnapshot (§22, §27)

### Dependency fix
- [x] Added @postpilot/adapters to apps/scheduler/package.json (was missing, caused tsc error)

---

---

## Phase 10: Social Accounts Management UI ✅ (NEW)

### Backend additions
- [x] **GET /oauth/:platform/init?workspaceId=** — creates oauth_state, builds platform OAuth URL (PKCE for LinkedIn/X), redirects browser (apps/api/src/routes/oauth.ts)
- [x] **DELETE /api/social-accounts/:accountId** — disconnect: token revoke, status=revoked, cancel queued jobs, audit_log (apps/api/src/routes/social-accounts.ts)

### Frontend — one component per file
- [x] **OrgProvider + useOrg()** — loads orgs + workspaces, stores active org/workspace in localStorage, React context (apps/web/src/lib/org-context.tsx)
- [x] **OrgSwitcher** — org dropdown (apps/web/src/components/layout/OrgSwitcher.tsx)
- [x] **NavLink** — active-state aware sidebar nav link (apps/web/src/components/layout/NavLink.tsx)
- [x] **Sidebar** — sidebar with logo, org switcher, nav, sign-out (apps/web/src/components/layout/Sidebar.tsx)
- [x] **Shell** — authenticated app layout wrapping Sidebar + main (apps/web/src/components/layout/Shell.tsx)
- [x] **PlatformIcon** — coloured avatar badge per platform (apps/web/src/features/accounts/PlatformIcon.tsx)
- [x] **HealthBadge** — healthy/warning/broken Badge (apps/web/src/features/accounts/HealthBadge.tsx)
- [x] **AccountCard** — connected account row with disconnect mutation (apps/web/src/features/accounts/AccountCard.tsx)
- [x] **ConnectPlatformButton** — navigates to OAuth init endpoint (apps/web/src/features/accounts/ConnectPlatformButton.tsx)
- [x] **/accounts route** — lists connected accounts, shows unconnected platforms with connect buttons (apps/web/src/routes/accounts.tsx)
- [x] **Dashboard updated** — uses Shell, loads real posts + accounts counts from API
- [x] **OrgProvider wired** — into `__root.tsx` wrapping the Outlet

### Infrastructure fixes (pre-existing issues resolved)
- [x] `routeTree.gen.ts` — proper TanStack Router v1 module augmentation with `FileRoutesByPath` interface (fixes all `createFileRoute` type errors)
- [x] `__root.tsx` — `HeadContent` + `Scripts` from `@tanstack/react-router` (not `@tanstack/start` which has no such exports)
- [x] `client.tsx` — `<StartClient />` (no props in v1 API)
- [x] `ssr.tsx` — `createStartHandler(defaultStreamHandler)` (new v1 API)
- [x] All web app types clean (zero `tsc` errors)

---

---

## Phase 11: Post Composer UI ✅ (NEW)

### API fixes
- [x] **POST /api/posts** — fixed hardcoded `platform: 'instagram'` in syndication_jobs (now looks up platform from social_accounts); added `mediaIds?: string[]` to body (links uploaded media to the post in the same transaction)

### Frontend — one component per file
- [x] **timezone.ts** — `localToUTC(localDT, tz)` converts datetime-local string + IANA TZ → UTC ISO string using Intl offset trick; `getDefaultTimezone()`, `getAllTimezones()` (apps/web/src/lib/timezone.ts)
- [x] **PlatformCheckbox** — checkbox row for a single social account (apps/web/src/features/accounts/PlatformCheckbox.tsx)
- [x] **PlatformSelector** — list of account checkboxes; empty state with link to /accounts (apps/web/src/features/accounts/PlatformSelector.tsx)
- [x] **TimezoneSelect** — native `<select>` using Intl.supportedValuesOf with COMMON_TIMEZONES fallback (apps/web/src/features/compose/TimezoneSelect.tsx)
- [x] **ScheduleField** — "Schedule for later" toggle + datetime-local input + TimezoneSelect (apps/web/src/features/compose/ScheduleField.tsx)
- [x] **MediaUploader** — file input (image/video, multi), uploads to /api/media/upload, thumbnail grid with remove button (apps/web/src/features/compose/MediaUploader.tsx)
- [x] **ComposerForm** — orchestrates PlatformSelector, textarea, MediaUploader, ScheduleField; per-platform character limits (X=280, IG=2200, LI=3000, YT=5000), TanStack Query mutation, navigate to /dashboard on success (apps/web/src/features/compose/ComposerForm.tsx)
- [x] **/compose route** — fetches accounts, renders ComposerForm (apps/web/src/routes/compose.tsx)
- [x] **Sidebar** — added "New Post" nav link to /compose
- [x] **routeTree.gen.ts** — added /compose route

---

## Phase 12: Email/Password Auth + Workspace & Org Settings UI ✅ (NEW)

### Auth
- [x] **emailAndPassword enabled** — Better Auth server config (apps/api/src/lib/auth.ts)
- [x] **features/auth/GoogleSignInButton.tsx** — shared Google OAuth button (extracted from login page)
- [x] **features/auth/EmailSignInForm.tsx** — email + password sign-in with error handling
- [x] **features/auth/EmailSignUpForm.tsx** — name + email + password registration form
- [x] **routes/login.tsx** — email form + divider + Google OAuth + link to /register
- [x] **routes/register.tsx** — registration page with email form + Google OAuth + link to /login
- [x] **DB relations** — added `user` relation to `orgMembersRelations` and `workspaceMembersRelations`

### Backend additions
- [x] **GET /api/orgs/members** — list active org members with user info (`with: { user }`)
- [x] **DELETE /api/orgs/members/:userId** — remove member (admin/owner; cannot remove owner)
- [x] **GET /api/orgs/invites** — list pending invites (admin/owner only)
- [x] **POST /api/workspaces** — now also inserts creator as workspace admin in same transaction
- [x] **GET /api/workspaces/:workspaceId/members** — list workspace members with user info
- [x] **POST /api/workspaces/:workspaceId/members** — add user to workspace (validates org membership)
- [x] **DELETE /api/workspaces/:workspaceId/members/:userId** — remove from workspace

### Workspace Management UI
- [x] **features/workspaces/WorkspaceCard.tsx** — workspace card with active state + role badge
- [x] **features/workspaces/CreateWorkspaceForm.tsx** — inline form to create a workspace
- [x] **routes/workspaces.tsx** — /workspaces page: list all workspaces, create form, click to set active

### Org Settings UI
- [x] **features/settings/MembersTab.tsx** — org member list + inline invite form + remove button
- [x] **features/settings/InvitesTab.tsx** — pending invites list + revoke button
- [x] **features/settings/BillingTab.tsx** — current plan display + plan matrix cards
- [x] **routes/settings.tsx** — /settings page with Members | Invites | Billing tab switcher

### Navigation
- [x] **Sidebar** — added Workspaces and Settings nav items
- [x] **routeTree.gen.ts** — updated with /workspaces and /settings routes

---

---

## Phase 13: Meta Webhook Processing + Analytics Dashboard UI ✅ (NEW)

### Backend
- [x] **webhookHandler Meta processing** — parses `entry[]` array from Meta webhook payload, looks up social account by `platformAccountId` + platform, calls `syncPostsHandler` directly for each matched account (apps/queue-worker/src/handlers/webhook.ts)
- [x] **drizzle-orm version alignment** — bumped queue-worker from `^0.44.1` to `^0.45.2` to match packages/db (eliminates all pre-existing tsc errors)

### UI — packages/ui
- [x] **chart.tsx** — shadcn chart component (recharts-based: ChartContainer, ChartTooltip, ChartLegend) added to `@postpilot/ui` and exported from index.ts

### UI — apps/web
- [x] **features/analytics/AccountSelector.tsx** — pill buttons to switch between connected accounts
- [x] **features/analytics/SummaryCards.tsx** — 4 stat cards: Total Posts, Total Likes, Comments, Shares/Views
- [x] **features/analytics/EngagementChart.tsx** — recharts LineChart (likes/comments/shares) with day-bucketed aggregation, empty state, loading state
- [x] **features/analytics/TopPostsTable.tsx** — top 20 posts sorted by likes, formatted engagement counts
- [x] **routes/analytics.tsx** — `/analytics` page: account selector → summary cards → engagement chart → posts table
- [x] **Sidebar** — added Analytics nav item (`BarChart2` icon)
- [x] **routeTree.gen.ts** — added `/analytics` route

---

## Phase 14: Backfill + Admin DLQ + KV Rate Limiting ✅ (NEW)

### Backfill queue + handler
- [x] **backfillHandler** — paginates through ALL platform post pages (up to 100), same upsert logic as syncPostsHandler with cursor tracking (apps/queue-worker/src/handlers/backfill.ts)
- [x] **worker.ts** — registered `BACKFILL` queue handler
- [x] **POST /api/social-accounts/:accountId/backfill** — validates account ownership + connected status, enqueues to `backfill_queue`, returns 202 (apps/api/src/routes/social-accounts.ts)

### Admin DLQ interface
- [x] **GET /api/admin/dlq** — lists dead_letter_jobs filtered by status (open/replayed/discarded), owner/admin only (apps/api/src/routes/admin.ts)
- [x] **POST /api/admin/dlq/:id/replay** — re-enqueues payload to source queue, marks replayed
- [x] **POST /api/admin/dlq/:id/discard** — marks discarded, no re-enqueue
- [x] **features/admin/DlqTable.tsx** — card-per-job with replay/discard buttons, expandable payload viewer, status badges (apps/web/src/features/admin/DlqTable.tsx)
- [x] **routes/admin.tsx** — `/admin` page with Open/Replayed/Discarded tab switcher, owner/admin guard
- [x] **Sidebar** — Admin nav item (`ShieldAlert` icon)
- [x] **routeTree.gen.ts** — `/admin` route registered

### KV rate limiting (§12)
- [x] **apps/queue-worker/src/lib/rate-limit.ts** — Cloudflare KV REST client: `isRateLimited()`, `recordRateLimit()`, `clearRateLimit()`; key: `rate_limit:{socialAccountId}`, graceful no-op when KV not configured
- [x] **publishHandler** — checks `isRateLimited()` before adapter.publish(); catches 429/rate-limit errors → `recordRateLimit()`, status=retrying
- [x] **syncPostsHandler** — checks `isRateLimited()` before adapter.syncPosts(); catches 429 → `recordRateLimit()`

### Infrastructure
- [x] drizzle-orm version skew fixed monorepo-wide (0.44.x → 0.45.2 everywhere)
- [x] Root package.json scripts fixed (build/dev/lint/clean now use `turbo run` not recursive `pnpm run`)
- [x] `pnpm install` run to restore missing symlinks in apps/api/node_modules

---

## Next Up — Implementation TODOs

---

## Phase 15: Composer Polish + Auth Guards + Forgot Password ✅ (NEW)

### Composer improvements
- [x] **PlatformCheckbox** — `@username` secondary line, health status dot (green/amber/red) overlaid on platform icon, platform name label on right, `healthStatus` prop wired (apps/web/src/features/accounts/PlatformCheckbox.tsx)
- [x] **PlatformSelector** — "Select all / Deselect all" toggle button when >1 account (apps/web/src/features/accounts/PlatformSelector.tsx)
- [x] **HashtagInput** — chip-style tag input: type + Enter/Space to add, Backspace to remove last, per-platform limits (IG 30, LI 3, YT 15), sanitises input (strips spaces/symbols) (apps/web/src/features/compose/HashtagInput.tsx)
- [x] **ComposerForm** — hashtag section wired: tags appended to full content on submit; per-platform character count breakdown row (shows X: 45/280, Instagram: 45/2200 etc.) with destructive colour on overrun; field label changed to "Caption" (apps/web/src/features/compose/ComposerForm.tsx)

### Auth guards (one place, zero per-route code)
- [x] **Zustand auth store** — `useAuthStore` with `persist` middleware; stores `isAuthed`, `userId`, `userName`, `userEmail` in localStorage as optimistic cache (apps/web/src/lib/auth-store.ts)
- [x] **RouteGuard** — single component mounted once in `__root.tsx` wrapping the `<Outlet>`; reads `useSession()` + current pathname; unauthenticated → `/login`, authenticated on public route → `/dashboard`; shows spinner while session resolves (apps/web/src/components/RouteGuard.tsx)
- [x] **PUBLIC_PATHS** — `/login`, `/register`, `/forgot-password`, `/reset-password`

### Forgot / reset password flow
- [x] **ForgotPasswordForm** — calls `authClient.requestPasswordReset({ email, redirectTo })`, shows success state (apps/web/src/features/auth/ForgotPasswordForm.tsx)
- [x] **ResetPasswordForm** — calls `authClient.resetPassword({ newPassword, token })`; client-side length + match validation; redirects to `/login` on success (apps/web/src/features/auth/ResetPasswordForm.tsx)
- [x] **routes/forgot-password.tsx** — `/forgot-password` page
- [x] **routes/reset-password.tsx** — `/reset-password?token=xxx` page; validates token presence
- [x] **EmailSignInForm** — "Forgot password?" link added beside Password label

### Workspace rename
- [x] **WorkspaceCard** — inline pencil-icon rename: click edit → Input replaces name text; Enter saves, Escape cancels; only shown for admin/owner role (apps/web/src/features/workspaces/WorkspaceCard.tsx)
- [x] **PATCH /api/workspaces/:workspaceId** — workspace admin or org admin/owner can rename; trims name, updates `updatedAt` (apps/api/src/routes/workspaces.ts)

### Remaining
- [ ] Approval workflow (approver role, post approval state)

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
- **Token encryption** — AES-256-GCM envelope in packages/shared, decrypt at point of use (§11)
- **Media deduplication** — SHA-256 checksum checked before upload, per-org scope (§26)
- **Platform adapters** — stateless singletons in packages/adapters, consumed by API + queue-worker
