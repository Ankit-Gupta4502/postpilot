# ARCHITECTURE.md (v4)

> Revision history: v2 closed the review gaps (oauth_states, idempotent publishing,
> partial-publish state, media status, dead-letter handling, per-account rate limiting, webhook
> verification, disconnect cleanup) and added the org/team model, plan-limit enforcement, and
> Razorpay billing. v3 added the plan-expiry lifecycle (one `plan_status` flag, two writers,
> pure-reader middleware).
>
> **v4 (this revision)** applies the Codex-reviewed additions: immediate platform-post sync on
> publish, append-only analytics snapshots, adaptive (hot/warm/cold) sync, job-lease crash
> recovery, timezone-aware scheduling, media deduplication, account health monitoring,
> webhook-first sync, Resend email, and a **pull-based queue consumer** (Fastify worker pulling
> from Cloudflare Queues over the HTTP Pull API — Cloudflare Workers are no longer used as
> consumers). Sections 21–32 are the v4 layer; where they conflict with an earlier section, the
> v4 section supersedes it, and the earlier section is annotated inline.
>
> Design intent and core principles from v1 are preserved.

---

## 0. Terminology Change: Org vs Workspace

v1 used "workspace" as the single tenancy unit. That conflates two different concepts that
teams need to keep separate:

- **Organization (`org`)** — the billing + identity boundary. Users belong to an org. Plans
  attach to an org. This is what an agency or company *is*.
- **Workspace** — a container *inside* an org that groups social accounts, posts, and members.
  An agency org may have one workspace per client.

A user joins an **org**. Within that org they are granted access to one or more **workspaces**.
This split is what makes agencies, white-label, and per-client separation work without
duplicating accounts.

```
Org (billing, identity)
 ├─ Members (users, org-level role)
 ├─ Workspace A (client 1)
 │    ├─ social_accounts
 │    ├─ posts / media
 │    └─ workspace members (subset of org members)
 └─ Workspace B (client 2)
      └─ ...
```

---

## 1. Design Principles (unchanged, restated)

1. **Database first** — PostgreSQL is the source of truth. Dashboards never call social APIs.
2. **Cost first** — Free users cost almost nothing. No dashboard request triggers a social API call.
3. **Queue driven** — Every expensive operation is asynchronous.
4. **Platform adapter pattern** — Each platform has its own adapter; never assume parity.

New principle added in v2:

5. **Exactly-once *effect*, at-least-once *delivery*** — Queues deliver at least once and retry.
   Every consumer that causes an external side effect (publishing) must be idempotent so that
   a redelivery never double-posts.

---

## 2. Tech Stack (unchanged)

- **Frontend:** TanStack Start, React, TypeScript, TanStack Query, Tailwind
- **Backend:** Fastify, TypeScript, Better Auth, Drizzle ORM
- **Database:** PostgreSQL
- **Storage:** Cloudflare R2
- **Cache:** Cloudflare KV (cache only, never source of truth)
- **Queue:** Cloudflare Queues
- **Hosting:** Backend on Hetzner / DO / Railway / Fly / GCP VM; frontend on TanStack Start

---

# 3. Identity & Team Model (NEW — the core of this revision)

## 3.1 Tables

### organizations
```sql
id              uuid pk
name            text not null
slug            text unique not null      -- white-label subdomain / URL
owner_user_id   uuid not null             -- the one user who can never be removed
plan            text not null default 'free'  -- free | starter | pro | agency
plan_status     text not null default 'active' -- active | past_due | cancelled
created_at      timestamptz
updated_at      timestamptz
```

### org_members
The org-level membership row. **This is how a user is "joined into an org."**
```sql
id           uuid pk
org_id       uuid not null references organizations(id)
user_id      uuid not null references users(id)
role         text not null              -- owner | admin | member | billing
status        text not null default 'active' -- active | suspended
invited_by   uuid references users(id)
joined_at    timestamptz
created_at   timestamptz

unique(org_id, user_id)                  -- a user joins an org at most once
```

Org roles:
- `owner` — full control, billing, can delete org. Exactly one, immovable (== `owner_user_id`).
- `admin` — manage members, workspaces, social accounts. No billing/delete-org.
- `billing` — billing + plan only, no content.
- `member` — no org-wide powers; access is granted per workspace (see below).

### org_invites
How a new or existing user gets pulled into an org.
```sql
id            uuid pk
org_id        uuid not null
email         text not null              -- invitee email (may not be a user yet)
role          text not null              -- org role to grant on accept
workspace_grants jsonb                    -- optional: [{workspace_id, role}] to pre-assign
token_hash    text not null              -- store hash, email the raw token
invited_by    uuid not null
status        text not null default 'pending' -- pending | accepted | revoked | expired
expires_at    timestamptz not null       -- e.g. now() + 7 days
accepted_by   uuid references users(id)
created_at    timestamptz

unique(org_id, email) where status = 'pending'  -- one live invite per email per org
```

### workspace_members
Membership *within* a workspace. A user must already be an `org_member` to appear here.
```sql
id            uuid pk
workspace_id  uuid not null references workspaces(id)
org_id        uuid not null              -- denormalized for fast authz + integrity
user_id       uuid not null references users(id)
role          text not null              -- admin | editor | approver | viewer
created_at    timestamptz

unique(workspace_id, user_id)
```

Workspace roles:
- `admin` — manage the workspace, its social accounts, and its members.
- `editor` — create/edit/schedule posts and upload media.
- `approver` — approve scheduled/queued posts (Agency approval workflow).
- `viewer` — read-only (dashboards, analytics).

### workspaces (revised — now nested under an org)
```sql
id           uuid pk
org_id       uuid not null references organizations(id)
name         text not null
created_by   uuid not null
created_at   timestamptz
updated_at   timestamptz
```

## 3.2 How a user joins an org (the flow)

```
Admin/Owner sends invite
        ↓
Insert org_invites (email, role, optional workspace_grants, token_hash, expires_at)
        ↓
Email raw token link:  https://{slug}.app/invite/accept?token=...
        ↓
Invitee opens link
        ↓
   ┌─ already has a user account? → log in (Better Auth)
   └─ new user?                   → sign up (Better Auth), then continue
        ↓
Backend: hash(token) == org_invites.token_hash  AND status='pending' AND not expired
        ↓
Transaction:
   - insert org_members(org_id, user_id, role, invited_by)
   - for each workspace_grant: insert workspace_members(...)
   - update org_invites set status='accepted', accepted_by=user_id
        ↓
User now sees the org in their org-switcher.
```

Key rules:
- **Invites are by email, not user id** — the invitee may not exist yet. Acceptance binds the
  invite to whatever `user_id` ends up logged in, recorded in `accepted_by`.
- **Tokens are stored hashed.** The raw token only ever lives in the email link.
- Invites **expire** and can be **revoked** (`status` transition). Expired/revoked tokens fail
  acceptance even if the URL is replayed.
- A user already in the org who clicks a second invite is a no-op (idempotent accept).

## 3.3 Multi-org users & org switching
- A user can belong to many orgs (freelancer working for several agencies).
- Application sessions are org-agnostic. The active org is selected per request via an
  `X-Org-Id` header (or `/org/:slug/...` path) and **must be validated** against `org_members`
  on every request. Never trust the client's claimed org.

## 3.4 Authorization resolution (every request)
```
1. Better Auth → who is the user? (session valid?)
2. org_members(org_id, user_id) exists & active?      → else 403
3. Resolve effective permission:
      org role (owner/admin) grants workspace access implicitly
      otherwise require workspace_members(workspace_id, user_id) row
4. Check the role is sufficient for the action.
```
Owners and org-admins implicitly have admin on every workspace in the org. `member` org-role
users have **only** the workspaces they were explicitly added to.

---

# 4. Application vs Social Authentication (unchanged intent)

- **Application auth** (Better Auth): "Is the user logged into our app?" Tables: `users`,
  `sessions`, `accounts`. Google OAuth → Better Auth session → cookie.
- **Social auth**: "Can we access a social account?" Stored in `social_accounts`. Completely
  independent of app sessions — logging out of the app does not disconnect social accounts.

---

# 5. Database Schema (revised tables)

## 5.1 oauth_states  (GAP FIXED — was referenced, never defined)
Short-lived CSRF/state store for the social OAuth handshake.
```sql
id            uuid pk
state         text unique not null       -- random, sent to provider
org_id        uuid not null
workspace_id  uuid not null              -- where the connected account will live
platform      text not null
created_by    uuid not null
redirect_uri  text not null
code_verifier text                       -- for PKCE platforms (X, etc.)
expires_at    timestamptz not null       -- e.g. now() + 10 minutes
consumed_at   timestamptz                -- single-use; set on callback
created_at    timestamptz
```
Rules: single-use (reject if `consumed_at` set), expires fast, deleted by a cleanup job.

## 5.2 social_accounts (revised)
```sql
id                      uuid pk
org_id                  uuid not null      -- NEW: org boundary
workspace_id            uuid not null
platform                text not null
platform_account_id     text not null
username                text
display_name            text
avatar_url              text
access_token            text              -- encrypted at rest (see §11)
refresh_token           text              -- encrypted at rest
expires_at              timestamptz
scopes                  text[]            -- NEW: what we were actually granted
status                  text not null     -- connected|expired|revoked|paused|error
metadata                jsonb
last_post_sync_at       timestamptz
last_analytics_sync_at  timestamptz
created_at              timestamptz
updated_at              timestamptz

unique(workspace_id, platform, platform_account_id)  -- no double-connect
```

## 5.3 posts (revised — derived aggregate status)
```sql
id            uuid pk
org_id        uuid not null
workspace_id  uuid not null
created_by    uuid not null
content       text
status        text not null    -- draft|scheduled|publishing|published|partial|failed
scheduled_for timestamptz
created_at    timestamptz
updated_at    timestamptz
```
`status` is **derived from its syndication_jobs**, not hand-set (GAP FIXED — partial publish):
- all jobs `success` → `published`
- some `success`, some terminal-`failed` → `partial`
- all terminal-`failed` → `failed`
- any job still in flight → `publishing`

A single enum could not express "Instagram ok, LinkedIn failed"; `partial` does.

## 5.4 media (revised — processing status) (GAP FIXED)
```sql
id          uuid pk
post_id     uuid
r2_key      text
mime_type   text
size        bigint
width       int
height      int
duration    int
status      text not null default 'uploading'  -- uploading|ready|failed
checksum    text                                -- for client/idempotent uploads
created_at  timestamptz
```
A syndication job must not run until **all** its post's media rows are `ready`. Video
transcode completion (signalled via `webhook_queue`) flips `uploading → ready`.

## 5.5 syndication_jobs (revised — idempotency) (GAP FIXED)
```sql
id                 uuid pk
post_id            uuid not null
social_account_id  uuid not null
platform           text not null
status             text not null     -- queued|running|success|failed|retrying|cancelled
attempts           int not null default 0
idempotency_key    text unique not null   -- NEW: e.g. hash(post_id|social_account_id)
error_message      text
published_post_id  text                   -- platform's id once posted
queued_at          timestamptz
completed_at       timestamptz

unique(post_id, social_account_id)        -- one job per destination
```
Consumer contract (prevents the duplicate-post-on-retry bug):
```
1. SELECT job FOR UPDATE
2. if status == success  → ACK, do nothing (already done)
3. if published_post_id set → reconcile to success, ACK
4. else call adapter.publish() with idempotency_key
5. persist published_post_id BEFORE acking the queue message
6. on retryable error → status=retrying, throw (queue redelivers)
   on permanent error → status=failed
```
The platform id is written to the DB **before** the queue ack, so a crash between API success
and ack results in step 3 reconciling rather than re-posting.

> **v4 update (§21):** on success, the consumer also **immediately upserts `platform_posts`**
> using the returned id, so dashboards reflect the post without waiting for a sync. Step 5 below
> is extended accordingly.

## 5.6 platform_posts (unchanged)
Imported content; `unique(social_account_id, platform_post_id)` prevents duplicates.

## 5.7 sync_state (clarified ownership)
`sync_state` is the **authoritative** pagination checkpoint per (account, sync_type). The
`last_*_sync_at` columns on `social_accounts` are **display-only mirrors** updated opportunistically
(GAP FIXED — removes the two-sources-of-truth ambiguity). Checkpoint types unchanged:
`cursor | page_token | since_id | offset | time_watermark`.

## 5.8 dead_letter_jobs  (GAP FIXED — DLQ was named but never modeled)
```sql
id              uuid pk
source_queue    text not null
payload         jsonb not null          -- original message
job_ref         uuid                    -- e.g. syndication_jobs.id if applicable
failure_reason  text
attempts        int
first_failed_at timestamptz
last_failed_at  timestamptz
replayed_at     timestamptz             -- set when an operator requeues
status          text not null default 'open'  -- open | replayed | discarded
```
After the configured retry count (3), the queue's dead-letter target writes here. An internal
admin screen can inspect and **replay** (re-enqueue payload) or **discard**. Alerting fires on
new `open` rows.

## 5.9 audit_log (NEW — needed once teams exist)
```sql
id          uuid pk
org_id      uuid not null
actor_user  uuid
action      text not null   -- member.invite, account.disconnect, post.publish, ...
target_type text
target_id   uuid
metadata    jsonb
created_at  timestamptz
```
Teams require accountability: who connected/disconnected an account, who removed a member,
who published. Append-only.

---

# 6. OAuth Flow (social account connect) — corrected

```
User clicks "Connect Instagram" (within a workspace)
        ↓
Backend authz: caller is workspace admin/editor?
        ↓
Create oauth_states row (state, code_verifier if PKCE, expires 10m, workspace_id)
        ↓
Redirect to provider
        ↓
Provider returns code + state
        ↓
Validate: state exists, not consumed, not expired → mark consumed_at
        ↓
Exchange code (+ code_verifier) for tokens
        ↓
Fetch account info; encrypt tokens; upsert social_accounts (unique guard)
        ↓
Enqueue first sync (latest 20 posts only)
```

---

# 7. Platform Adapter Architecture (unchanged + idempotency)
```ts
interface PlatformAdapter {
  connect()
  refreshToken()
  publish(input, idempotencyKey)   // MUST be safe to call twice
  syncPosts(checkpoint)
  syncAnalytics()
  disconnect()
  handleWebhook(req)               // MUST verify signature (see §10)
  verifyWebhook(req): boolean      // NEW: explicit signature check
}
```
Checkpoint support per platform unchanged (Instagram cursor/time_watermark; X
since_id/pagination_token; YouTube page_token/published_after; LinkedIn offset/page_token).

---

# 8. Queues (unchanged set, with DLQ + per-account rate keys)
`publish_queue` (highest priority), `scheduled_publish_queue`, `sync_posts_queue` (6h),
`analytics_queue` (6h), `token_refresh_queue` (daily), `webhook_queue`,
`backfill_queue` (lowest). Every queue has a dead-letter target → `dead_letter_jobs`.

> **v4 updates:** (a) consumers are now **pull-based Fastify workers** over the Cloudflare Queues
> HTTP Pull API — Cloudflare Workers are no longer used (§31). (b) `analytics_queue` cadence is
> no longer a flat 6h; it is **adaptive hot/warm/cold** per account (§23). (c) `sync_posts_queue`
> is now triggered **webhook-first**, with polling as fallback (§28).

### Scheduling flow — corrected (GAP FIXED: the two paths contradicted)
v1 both defined `scheduled_publish_queue` *and* said cron pushes to `publish_queue`. Resolution:
```
Post saved as 'scheduled' with scheduled_for
        ↓
Cron (every minute) selects posts due now
        ↓
Enqueue into scheduled_publish_queue   ← the dedicated queue is the one used
        ↓
Consumer runs the SAME publish path as publish_queue (shared code)
```
`publish_queue` = "publish now"; `scheduled_publish_queue` = "publish at time". Same consumer
logic, different priority/source. No more ambiguity.

---

# 9. Publishing Flow (revised, idempotent, media-gated)
```
User creates post
        ↓
Upload media → R2 → media rows (status=uploading; flip to ready when processed)
        ↓
Create post (status=draft→publishing)
        ↓
Create one syndication_job per destination (idempotency_key set)
        ↓
GATE: enqueue a job only when all its media are 'ready'
        ↓
Push queue messages → return success immediately
        ↓
Consumers publish idempotently; write published_post_id before ack
        ↓
Recompute post.status from job outcomes (published | partial | failed)
```

---

# 10. Webhooks — verification (GAP FIXED)
Every inbound webhook is **signature-verified before processing**:
- Validate the platform's HMAC/signature header against the app secret (and challenge handshakes
  for subscription setup).
- Reject unverified payloads with 401; never enqueue them.
- Verified payloads are enqueued to `webhook_queue` and processed async (video-ready, comment,
  status change). Processing is idempotent on the platform event id.

---

# 11. Token & Secret Handling
- `access_token` / `refresh_token` are **encrypted at rest** (app-level envelope encryption;
  KMS-managed key). DB compromise alone does not leak usable tokens.
- `token_refresh_queue` runs daily: find tokens near expiry → refresh → update
  `social_accounts`. On refresh failure → `status=expired`, notify workspace admins, pause sync.

---

# 12. Rate Limiting — corrected key (GAP FIXED)
Rate limits are **per social account (per token)**, not per platform. Two Instagram accounts
have independent budgets.
```
KV key: rate_limit:{social_account_id}
value : { remaining, reset_at }
```
KV is used as a soft, fast hint for backoff scheduling. Because KV is eventually consistent, it
is **advisory only**: the true limiter is the platform's own 429 response, which workers always
honor (delay / retry / exponential backoff). KV reduces wasted calls; it is never trusted as a
hard counter.

---

# 13. Disconnect & Cleanup (GAP FIXED — was undefined)
When `disconnect()` is called on a social account:
```
1. Call provider token revocation (best effort)
2. social_accounts.status = 'revoked'
3. Cancel in-flight syndication_jobs for that account (status=cancelled)
4. Pause/stop its sync_state rows
5. Invalidate KV: feed:{workspaceId}, analytics:{accountId}, profile:{accountId}, rate_limit:{accountId}
6. Retain platform_posts + R2 media (history is intentionally preserved)
7. audit_log: account.disconnect
```
Media is never auto-deleted (reposting, history). Removing a *workspace member* revokes their
access but touches no content. Removing an *org member* cascades: drop their `workspace_members`
rows; their authored posts remain (attributed to the user, ownership reassignable by an admin).

---

# 14. Failure Handling (consolidated)
- **Token revoked** → `status=revoked`, pause sync, notify admins.
- **Duplicate imports** → prevented by `unique(social_account_id, platform_post_id)`.
- **Duplicate publishes** → prevented by idempotency_key + published_post_id reconciliation (§5.5).
- **Partial publish** → represented as `posts.status='partial'`; per-job truth in syndication_jobs.
- **Queue failure** → 3 retries → `dead_letter_jobs` → alert → operator replay/discard.
- **API outage** → adapter returns retryable error → queue redelivers with backoff.

---

# 15. Caching (unchanged)
KV is cache only. `feed:{workspaceId}` 300s, `analytics:{accountId}` 6h, `profile:{accountId}`
24h, `rate_limit:{accountId}` (see §12). Dashboard reads PostgreSQL on miss, repopulates KV,
never calls a social API.

---

# 16. Billing, Plans & Limit Enforcement (expanded)

Plans attach to **organizations** (the billing boundary), never to individual workspaces or
users. Pricing is dimensioned on value drivers, **never on imported post count**.

## 16.1 Plan matrix
| Dimension | Free | Starter | Pro | Agency |
|---|---|---|---|---|
| Connected social accounts | 2 | 10 | 25 | 100 |
| Workspaces | 1 | 1 | 1 | unlimited |
| Members (org) | 1 | 3 | 10 | unlimited |
| Scheduled posts (concurrent) | 50 | unlimited | unlimited | unlimited |
| Analytics retention | 7 days | 30 days | 90 days | 365 days |
| First-import depth | latest 20 | latest 20 | latest 20 | latest 20 |
| Teams / roles | — | — | yes | yes |
| Approval workflows | — | — | — | yes |
| White-label (slug) | — | — | — | yes |

Billing axes: connected accounts, members, analytics retention, scheduling limits, workspace
count. Historical import volume is **explicitly not** a billing axis (principle: imports are
cheap to the user, costly only to us, and we control them via the backfill queue).

## 16.2 plan_limits (source of truth for enforcement)
Limits are **data, not hard-coded**, so plans can change without a deploy.
```sql
-- one row per plan; the org's effective limits are looked up by organizations.plan
plan            text pk          -- free | starter | pro | agency
max_accounts    int
max_workspaces  int
max_members     int
max_scheduled   int              -- null = unlimited
analytics_retention_days int
features        jsonb            -- { teams:bool, approvals:bool, white_label:bool }
```
`organizations.plan` + `plan_status` (from §3.1) point at the active row. A short-TTL KV entry
`plan_limits:{plan}` caches it; PostgreSQL remains source of truth.

## 16.3 Enforcement model (the part v1 and the first v2 left vague)
Two layers, because soft and hard limits behave differently:

**A. Pre-action gate (synchronous, on the write path).**
Each guarded mutation checks the live count against the limit *inside the same transaction* that
performs the insert, so two concurrent requests can't both slip past a cap (count + insert under
the same row lock / `SELECT ... FOR UPDATE` on the org row, or a unique partial-count constraint).
```
connect social account → COUNT social_accounts WHERE org_id AND status!='revoked'
                          must be < plan_limits.max_accounts  else 402 PLAN_LIMIT
invite member          → COUNT active org_members < max_members  else 402
create workspace       → COUNT workspaces < max_workspaces      else 402
schedule post          → COUNT posts status='scheduled' < max_scheduled (if not null) else 402
use teams/approvals    → require plan_limits.features flag       else 402 FEATURE_LOCKED
```
The API returns `402 Payment Required` with a machine-readable `{ code, limit, current, plan }`
so the frontend can show the right upgrade prompt.

**B. Retention enforcement (asynchronous, scheduled).**
Analytics retention is enforced by a daily job, not on read:
```
daily: for each org → delete history older than plan_limits.analytics_retention_days
```
Dashboards simply read whatever survives; no per-request retention math.

> **v4 update (§22):** metric history now lives in the append-only `post_metric_snapshots`
> table (not in `platform_posts.metrics`, which keeps only the latest values). The daily cleanup
> deletes snapshots older than the org's retention window. Agency retention is 365 days.

## 16.4 Downgrade / past-due handling
Plan changes can put an org **over** the new limit (e.g. Pro→Free with 5 accounts). Policy:
- Never silently delete the user's data on downgrade.
- Org enters a **grace/over-limit state**: existing accounts keep publishing, but *new* guarded
  actions are blocked until the org is back under the cap or re-upgrades.
- `plan_status='past_due'` (failed payment) follows the same rule: reads + publishing continue
  during the dunning window; new account connects / invites are gated. This honors the final
  principle — **publishing must keep working** even when billing is unhappy.

## 16.5 Where this lives in the request path
The §3.4 authorization resolver is extended with a final step:
```
4. role sufficient for action?           (existing)
5. plan limit / feature check for action  (NEW — §16.3 gate)
```
Authz answers "are you *allowed*"; the plan gate answers "does your *plan permit it*." Both must
pass.

---

# 17. Razorpay Billing Integration (NEW)

Razorpay is the payment provider that drives the plan transitions in §16. The hard rule:
**the Razorpay webhook is the source of truth for money, never the browser callback.** The
client-side success handler only improves UX; `organizations.plan` / `plan_status` are flipped
only after a signature-verified webhook (or a verified server-side fetch) confirms the payment.

## 17.1 Order vs Subscription — which path
- **Subscriptions** (primary): recurring monthly/annual plans (Starter/Pro/Agency) use Razorpay
  Subscriptions tied to a Razorpay `plan_id`. Razorpay charges on each cycle and emits
  `subscription.charged` events; we mirror state locally.
- **Orders** (one-off): used for annual upfront payments, add-ons, or manual top-ups via the
  create-order → checkout → capture flow.

Both flows converge on the same `payments` ledger and the same webhook handler.

## 17.2 Tables

### billing_customers
Maps our org to Razorpay's customer entity (one per org).
```sql
id                     uuid pk
org_id                 uuid not null unique references organizations(id)
razorpay_customer_id   text unique           -- cust_xxx
email                  text
contact                text
created_at             timestamptz
updated_at             timestamptz
```

### subscriptions
Local mirror of a Razorpay subscription. Webhook-authoritative.
```sql
id                        uuid pk
org_id                    uuid not null references organizations(id)
razorpay_subscription_id  text unique not null   -- sub_xxx
razorpay_plan_id          text not null          -- plan_xxx (maps to our plan tier)
plan                      text not null          -- starter | pro | agency
status                    text not null          -- created|authenticated|active|pending|halted|cancelled|completed|expired
current_period_start      timestamptz
current_period_end        timestamptz
cancel_at_period_end      boolean default false
short_url                 text                   -- Razorpay-hosted auth/checkout link
created_at                timestamptz
updated_at                timestamptz
```

### orders
One order per checkout attempt (one-off payments). Mirrors a Razorpay order.
```sql
id                  uuid pk
org_id              uuid not null references organizations(id)
razorpay_order_id   text unique not null    -- order_xxx
purpose             text not null           -- plan_upgrade | annual | addon | topup
target_plan         text                    -- plan to grant on success (if plan-related)
amount              bigint not null         -- in paise (Razorpay's smallest unit)
currency            text not null default 'INR'
receipt             text                    -- our internal receipt id (idempotent)
status              text not null           -- created | attempted | paid | failed
notes               jsonb                   -- {org_id, target_plan, ...} echoed by Razorpay
created_by          uuid not null
created_at          timestamptz
updated_at          timestamptz
```

### payments
The money ledger. One row per Razorpay payment entity — append-mostly, reconcilable.
```sql
id                    uuid pk
org_id                uuid not null references organizations(id)
razorpay_payment_id   text unique not null   -- pay_xxx
razorpay_order_id     text                   -- nullable (subscription charges have none)
subscription_id       uuid references subscriptions(id)
amount                bigint not null        -- paise
currency              text not null
status                text not null          -- created|authorized|captured|refunded|failed
method                text                   -- card | upi | netbanking | wallet
captured              boolean default false
fee                   bigint                 -- Razorpay fee (paise)
tax                   bigint
error_code            text
error_description     text
created_at            timestamptz            -- our insert time
paid_at               timestamptz            -- from Razorpay
```

### refunds
```sql
id                   uuid pk
payment_id           uuid not null references payments(id)
razorpay_refund_id   text unique not null    -- rfnd_xxx
amount               bigint not null
status               text not null           -- pending | processed | failed
reason               text
created_at           timestamptz
```

### webhook_events  (idempotency for billing webhooks)
Every Razorpay webhook is recorded before processing so redelivery is a no-op.
```sql
id                  uuid pk
razorpay_event_id   text unique not null    -- x-razorpay-event-id header
event_type          text not null           -- payment.captured, subscription.charged, ...
payload             jsonb not null
signature_valid     boolean not null
processed_at        timestamptz
status              text not null default 'received'  -- received | processed | ignored | failed
created_at          timestamptz
```

## 17.3 Upgrade flow (subscription)
```
User picks Pro
        ↓
Backend authz (org admin/billing) + ensure billing_customer exists
        ↓
Create Razorpay subscription (razorpay_plan_id for Pro, notes={org_id, plan})
        ↓
Insert subscriptions row (status='created'), return short_url / checkout opts to client
        ↓
User authenticates payment on Razorpay Checkout
        ↓
Razorpay → webhook: subscription.activated / payment.captured  (SIGNED)
        ↓
Webhook handler (idempotent): verify signature → upsert payments → set
subscriptions.status='active' → set organizations.plan='pro', plan_status='active'
        ↓
audit_log: billing.plan_changed
```
The browser's checkout `handler` callback may also hit a verify endpoint, but it only
*confirms*; it never grants the plan on its own.

## 17.4 One-off order flow
```
Create order (amount in paise, receipt=internal idempotent id, notes={org_id,target_plan})
        ↓
Insert orders row (status='created') → return razorpay_order_id to client
        ↓
Razorpay Checkout → returns {order_id, payment_id, signature} to client
        ↓
Server verifies signature = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)
        ↓
Reconcile with webhook payment.captured (authoritative) → orders.status='paid'
        ↓
Apply target_plan if order.purpose='plan_upgrade'
```

## 17.5 Webhook handling (security + idempotency)
```
1. Verify X-Razorpay-Signature = HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
   → mismatch: 400, do not process
2. INSERT webhook_events (razorpay_event_id) — unique violation == duplicate → 200 OK, stop
3. Enqueue to webhook_queue (or process inline); processing is idempotent on event id
4. Apply state change (payments / subscriptions / organizations)
5. webhook_events.status='processed'
```
Events handled: `payment.captured`, `payment.failed`, `order.paid`, `subscription.activated`,
`subscription.charged`, `subscription.halted`, `subscription.cancelled`, `refund.processed`.

## 17.6 Failed payment → dunning (ties to §16.4)
- `payment.failed` / `subscription.halted` → `organizations.plan_status='past_due'`.
- Per §16.4, publishing and reads continue during the dunning window; only new guarded actions
  (connect account, invite member) are gated. Razorpay retries the charge per its schedule.
- On recovery (`subscription.charged`) → `plan_status='active'`. On terminal failure →
  downgrade to `free` using the non-destructive over-limit policy (§16.4).

## 17.7 Amount & currency rules
- All amounts stored in **paise** (integer), currency `INR` by default. Never store floats.
- The `payments` ledger is the reconciliation source against Razorpay's settlement reports.
- Refunds are tracked separately and never mutate the original payment row's amount.

---

# 18. Plan Expiry Lifecycle (NEW in v3)

## 18.1 The principle: one authoritative flag, two writers, one reader
`organizations.plan_status` is the **single source of truth** for whether an org's paid access is
currently valid. Nothing in the request path ever recomputes expiry from dates. The design has
exactly:

- **Two writers** of `plan_status`:
  1. **Razorpay webhooks** (§17.5) — the *fast path*. The instant a charge fails or a
     subscription is cancelled, the webhook flips the flag.
  2. **The daily reconciliation job** (§18.3) — the *safety net*. Catches anything the webhook
     missed, was delayed on, or never fired for (a subscription that simply reached
     `current_period_end` with no renewal event).
- **One reader**: the **plan-enforcement middleware** (§18.4). It only *reads* `plan_status`; it
  never does date math or writes. "Restrict the user" happens by reading one already-set flag.

Why this shape:
- Writing in one place (and only two code paths) means the rule lives in one spot — no scattered
  `if (subscription.expired)` checks drifting out of sync across routes.
- A daily cadence (not month-end) bounds worst-case over-grant to <24h, while month-end batching
  could leave an org on a paid tier for weeks after they stopped paying.
- Middleware-as-pure-reader keeps every request cheap (one indexed column read, often already in
  the session/org context) and behaviorally identical regardless of how the flag got set.

## 18.2 plan_status state machine
```
active        — paid & current; full access
past_due      — a charge failed / subscription halted; in dunning grace window
                (reads + PUBLISHING continue; new guarded actions blocked — §16.4)
expired       — grace window elapsed OR period ended with no renewal; downgraded to free tier
                limits (non-destructive — data retained per §16.4)
cancelled     — user cancelled; access continues until current_period_end, then → expired
```
Transitions:
```
active --(payment.failed / subscription.halted)--> past_due        [webhook]
past_due --(subscription.charged / payment.captured)--> active     [webhook, recovery]
past_due --(grace_until < now)--> expired                          [daily job]
active/cancelled --(current_period_end < now, no renewal)--> expired [daily job]
active --(user cancels)--> cancelled                               [webhook/API]
expired/cancelled --(new successful subscription)--> active        [webhook]
```

## 18.3 Daily reconciliation job (replaces any month-end batch)
A scheduled worker that runs **once per day** (cron, e.g. 00:15 UTC). It is the reconciliation
sweep — idempotent, safe to run repeatedly, and the authority of last resort.

New supporting columns on `organizations` (additive):
```sql
grace_until        timestamptz   -- when past_due grace expires (set when entering past_due)
plan_checked_at    timestamptz   -- last time the daily job evaluated this org
```

Job logic (single pass over orgs with a paid plan or non-active status):
```
For each org where plan != 'free' OR plan_status != 'active':

  load latest subscription (if any)

  -- 1. Past-due grace elapsed → expire
  if plan_status = 'past_due' and grace_until < now():
        set plan='free', plan_status='expired'

  -- 2. Subscription period ended with no active renewal → expire
  else if subscription.status in ('halted','cancelled','expired','completed')
          and subscription.current_period_end < now():
        set plan='free', plan_status='expired'

  -- 3. Active but period end passed and webhook for renewal hasn't arrived → reconcile
  else if plan_status = 'active'
          and subscription.current_period_end < now():
        -- verify against Razorpay (server-side fetch) before downgrading,
        -- to avoid a missed 'charged' webhook wrongly expiring a paying org
        fetch subscription from Razorpay API
        if still active upstream → resync current_period_end, keep active
        else → set plan='free', plan_status='expired'

  set plan_checked_at = now()
  if state changed → audit_log(billing.plan_expired) + enqueue notification + invalidate caches
```
Key safeguards:
- **Verify before expiring an `active` org** with a server-side Razorpay fetch (case 3). A single
  dropped `subscription.charged` webhook must not kick a paying customer to free. The webhook is
  the fast path; the API fetch is the tie-breaker.
- **Idempotent**: re-running produces the same state; `plan_checked_at` records coverage.
- **Bounded work**: only touches orgs that aren't already settled-active-on-free.
- Runs on its own schedule; it is independent of `token_refresh_queue` (daily) but may share the
  same cron infrastructure. Failures go to `dead_letter_jobs` like any other job.

When the job (or webhook) sets `expired`, the **over-limit policy from §16.4 applies**: the org
is now on free-tier limits but its accounts, posts, and media are retained; only new guarded
actions are blocked, and publishing on already-connected accounts continues.

## 18.4 Plan-enforcement middleware (pure reader)
A single middleware sits in the request pipeline **after** auth + org resolution (§3.4) and
**before** route handlers. It reads `plan_status` (already loaded with the org context) and
classifies the route:

```
resolve org → plan_status already known (no recompute, no date math)

classify the incoming action:
  READ            (dashboards, analytics, viewing posts)         → always allowed
  PUBLISH         (publish now / scheduled publish)              → allowed unless 'expired'? 
                                                                    NO — allowed even when past_due;
                                                                    on 'expired' subject only to
                                                                    free-tier caps, not blocked outright
  GUARDED_WRITE   (connect account, invite member, create
                   workspace, schedule beyond free cap, use
                   teams/approvals/white-label)                  → require plan_status='active'
                                                                    AND §16.3 plan-limit gate

if GUARDED_WRITE and plan_status in ('past_due','expired','cancelled-past-period'):
      → 402 PLAN_INACTIVE { plan_status, plan, action }
```

Design notes for the reviewer:
- The middleware is **stateless and read-only** — it never writes `plan_status`. That guarantees
  the flag has exactly two writers (§18.1) and the restriction logic exists in one place.
- It distinguishes **READ / PUBLISH / GUARDED_WRITE** so the final principle holds: an expired or
  past-due org can still *read* and still *publish on existing accounts* (degraded to free
  limits), honoring "publishing must keep working even when billing is unhappy." Only growth
  actions that cost us money or unlock paid features are gated.
- Route classification is declarative (a per-route capability tag), not ad-hoc conditionals in
  handlers — so adding a route means tagging it, not re-implementing the check.
- The middleware composes with §16.3: `plan_status='active'` passes this gate, then the numeric
  limit check runs. Both must pass for a guarded write.

## 18.5 End-to-end: how an expired payment restricts a user
```
Day 0  Razorpay charge fails
        → webhook payment.failed → plan_status='past_due', grace_until=now()+7d  [writer 1]
        → user keeps publishing + reading; cannot connect new accounts (middleware reads flag)

Day 1..7  daily job sees past_due, grace_until in future → no change, records plan_checked_at
          (Razorpay may auto-retry; on success: subscription.charged → plan_status='active')

Day 8  daily job: past_due AND grace_until < now()
        → plan='free', plan_status='expired'  [writer 2]
        → audit_log + notify + cache invalidation
        → from next request, middleware reads 'expired':
             reads OK, publishing on existing accounts OK (free caps),
             new guarded writes → 402 PLAN_INACTIVE
```
No month-end batch, no per-request expiry computation, one flag, two writers, one reader.

---

# 19. Environment Variables (`.env`)

Required configuration. Secrets are never committed; production values come from the host's
secret manager. `*_SECRET` / `*_KEY` values must be treated as sensitive.

```bash
# ── Core ───────────────────────────────────────────────
NODE_ENV=production                    # development | production
APP_BASE_URL=https://app.example.com   # used to build OAuth + invite + checkout redirect URLs
PORT=8080

# ── Database (PostgreSQL — source of truth) ────────────
DATABASE_URL=postgres://user:pass@host:5432/dbname
DATABASE_SSL=true

# ── Application Auth (Better Auth) ─────────────────────
BETTER_AUTH_SECRET=                    # session signing secret
BETTER_AUTH_URL=https://app.example.com
GOOGLE_CLIENT_ID=                      # app login (Google OAuth)
GOOGLE_CLIENT_SECRET=

# ── Token / Secret encryption (§11) ────────────────────
ENCRYPTION_KEY=                        # 32-byte key (base64) for social token envelope encryption
KMS_KEY_ID=                            # optional: managed key id if using a KMS

# ── Cloudflare R2 (media storage) ──────────────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=social-media
R2_PUBLIC_BASE_URL=https://cdn.example.com

# ── Cloudflare KV (cache only) ─────────────────────────
CF_ACCOUNT_ID=
CF_API_TOKEN=
KV_NAMESPACE_ID=

# ── Cloudflare Queues ──────────────────────────────────
CF_QUEUES_API_TOKEN=                   # if managed via API/bindings
PUBLISH_QUEUE=publish_queue
SCHEDULED_PUBLISH_QUEUE=scheduled_publish_queue
SYNC_POSTS_QUEUE=sync_posts_queue
ANALYTICS_QUEUE=analytics_queue
TOKEN_REFRESH_QUEUE=token_refresh_queue
WEBHOOK_QUEUE=webhook_queue
BACKFILL_QUEUE=backfill_queue

# ── Razorpay (billing — §17) ───────────────────────────
RAZORPAY_KEY_ID=                       # rzp_live_xxx (publishable; sent to client checkout)
RAZORPAY_KEY_SECRET=                   # SECRET — server only, never exposed to client
RAZORPAY_WEBHOOK_SECRET=               # SECRET — verifies X-Razorpay-Signature
RAZORPAY_PLAN_ID_STARTER=plan_xxx      # maps Razorpay plan → our 'starter' tier
RAZORPAY_PLAN_ID_PRO=plan_xxx
RAZORPAY_PLAN_ID_AGENCY=plan_xxx
BILLING_CURRENCY=INR

# ── Social Platform OAuth (per platform) ───────────────
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
# Each platform's redirect URI is derived from APP_BASE_URL, e.g.
# {APP_BASE_URL}/oauth/{platform}/callback

# ── Platform webhook verification secrets ──────────────
META_WEBHOOK_VERIFY_TOKEN=             # Instagram/Facebook subscription handshake
META_APP_SECRET=                       # HMAC verification of Meta webhooks

# ── Email (invites §3.2, billing receipts) ─────────────
EMAIL_FROM=no-reply@example.com
SMTP_URL=                              # or provider API key, e.g. RESEND_API_KEY / POSTMARK_TOKEN

# ── Observability (optional but recommended) ───────────
SENTRY_DSN=
LOG_LEVEL=info

# ── Scheduled jobs / cron (§18) ────────────────────────
PLAN_EXPIRY_CRON=15 0 * * *            # daily plan reconciliation sweep (00:15 UTC)
PAST_DUE_GRACE_DAYS=7                  # dunning window before past_due → expired
TOKEN_REFRESH_CRON=0 2 * * *           # daily token refresh sweep
SYNC_INTERVAL_HOURS=6                  # posts + analytics sync cadence
```

Notes for the reviewer:
- Only `RAZORPAY_KEY_ID` is client-exposed; `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`
  are server-only. Leaking the webhook secret would let an attacker forge plan upgrades.
- `ENCRYPTION_KEY` protects social tokens at rest (§11); rotating it requires a re-encryption job.
- Queue names are configurable so staging/prod can run isolated queues on one account.

---

# 20. v4 Layer — Overview

Sections 21–32 are the v4 additions (the Codex-reviewed changelog), numbered to match that
changelog. Each either adds a capability or supersedes an earlier section; superseded sections
carry an inline `v4 update` note pointing here. The closing principle moved to §32.

---

# 21. Immediate Platform-Post Sync (v4)

**Problem (v3):** `platform_posts` was populated only by sync jobs, so a just-published post
didn't appear on the dashboard until the next sync — a visible delay.

**v4:** when a syndication job succeeds, the consumer **immediately upserts `platform_posts`**
from the returned platform id, in the same transaction that records `published_post_id`. No sync
wait. This extends the §5.5 consumer contract (step 5 now also upserts the local mirror):
```
... call adapter.publish() → returns platform_post_id
persist published_post_id  AND  upsert platform_posts (idempotent on
    unique(social_account_id, platform_post_id))  BEFORE acking the queue
```
Because the upsert keys on the existing uniqueness constraint, a later sync that re-sees the same
post is a no-op — no duplicate, no conflict.

**Sync jobs are now responsible only for content that originated *outside* our platform:**
external posts, external edits, external deletes, external analytics, and webhook reconciliation.
Posts we publish are mirrored instantly and never wait on sync.

---

# 22. Analytics Snapshot Architecture (v4)

**Problem (v3):** `platform_posts.metrics` stored only the latest values, so growth/reach/
engagement trends were impossible to chart.

**New table — append-only history:**
```sql
-- post_metric_snapshots
id                uuid pk
platform_post_id  uuid not null references platform_posts(id)
likes             bigint
comments          bigint
shares            bigint
views             bigint
reach             bigint
captured_at       timestamptz not null
```
`platform_posts.metrics` keeps the *latest* values (fast current-state reads); every analytics
refresh **inserts** a snapshot here — never updates. Trends are computed from snapshots.

**Retention** (enforced by the daily cleanup of §16.3B, now operating on this table):
Free 7d · Starter 30d · Pro 90d · **Agency 365d**. This is the source of the §16.1 matrix change.

Index `(platform_post_id, captured_at)` for time-series queries.

---

# 23. Adaptive Analytics Sync (v4)

**Problem (v3):** every account synced every 6h regardless of whether anyone looks at it —
wasteful and a needless API cost.

**New columns on `social_accounts`:**
```sql
last_dashboard_view_at   timestamptz
analytics_sync_priority  text   -- hot | warm | cold
```
`last_dashboard_view_at` is stamped whenever a dashboard reads that account's analytics. A small
step in the scheduler derives `analytics_sync_priority` from it.

**Cadence by tier:**
- **hot** — dashboard viewed within 24h → sync every 6h
- **warm** — viewed within 7d → sync every 24h
- **cold** — inactive >30d → sync weekly

The scheduler enqueues `analytics_queue` jobs per the account's tier rather than on a flat timer.
Expected API-usage reduction: 80–95%. This honors the cost-first principle without hurting active
users (whoever is actually looking gets fresh data).

---

# 24. Job Lease Recovery (v4)

**Problem (v3):** if a consumer crashes mid-publish, the job sits at `status='running'` forever
and never retries.

**New columns on `syndication_jobs`:**
```sql
processing_started_at  timestamptz
lease_expires_at       timestamptz
```
**On pick-up**, the worker sets `processing_started_at = now()` and `lease_expires_at = now()+15m`.
On completion the job moves to its terminal state as before.

**Recovery worker (every 5 min)** reclaims abandoned leases:
```sql
UPDATE syndication_jobs
SET status='queued', processing_started_at=NULL, lease_expires_at=NULL
WHERE status='running' AND lease_expires_at < now();
```
The reclaimed job is re-enqueued and retried. Combined with the idempotency contract (§5.5/§21),
a job that actually *did* publish before crashing reconciles via `published_post_id` instead of
double-posting — lease recovery is safe precisely because publish is idempotent.

---

# 25. Timezone-Aware Scheduling (v4)

**Problem (v3):** a bare `scheduled_for` is ambiguous about whose clock it means.

**New fields on `posts`** (replacing the ambiguous single column):
```sql
scheduled_for_utc    timestamptz   -- authoritative instant
scheduled_timezone   text          -- IANA zone, e.g. Asia/Kolkata, America/New_York, Europe/London
```
**Rule:** always convert to **UTC before storage**; the scheduler's "due now" comparison is in
UTC. The original IANA zone is retained only so the UI can display the time in the user's intended
zone and handle DST correctly on edit. The §8 scheduling cron compares `scheduled_for_utc <= now()`.

---

# 26. Media Deduplication (v4)

**Problem (v3):** the same asset uploaded repeatedly inflates R2 storage (common for agencies
reusing brand video).

**`media.checksum` (SHA-256) becomes mandatory.** Upload flow:
```
receive file → compute SHA-256
            → look up existing media with same checksum (same org scope)
   found?   → reuse existing r2_key (no upload)
   missing? → upload to R2, store checksum
```
Dedup is scoped per org (don't share bytes across tenants, to keep deletion/ownership clean).
Expected storage savings 20–50% for agencies. Reference counting: an `r2_key` is only eligible
for deletion when no `media` row references it — but recall media is intentionally never
auto-deleted (§13), so this mainly governs explicit cleanup.

---

# 27. Account Health Monitoring (v4)

**New columns on `social_accounts`:**
```sql
health_status       text   -- healthy | warning | broken
last_error_at       timestamptz
last_error_message  text
```
- **warning** — recoverable / imminent issue (e.g. token expiring soon).
- **broken** — needs user action (permissions revoked, token invalid, account deleted).

`health_status` is updated by the adapters and the token-refresh/sync paths when they encounter
errors. It complements the existing `status` column (`connected/expired/revoked/...`): `status`
is the connection lifecycle, `health_status` is the operational signal surfaced to users. The
dashboard splits accounts into "Healthy" and "Requiring action."

---

# 28. Webhook-First Synchronization (v4)

**Principle:** for external changes, **webhook beats polling.**
```
Platform webhook → verify signature (§10) → store event (webhook_events / idempotent)
                 → enqueue sync job → refresh just the affected account data
```
Polling (the §23 adaptive cadence) **remains as a fallback** for missed webhooks, provider
outages, and delivery failures. So the system is webhook-driven for freshness but never *depends*
on webhooks for correctness — polling guarantees eventual reconciliation.

---

# 29. Resend Email Service (v4)

Email provider is **Resend**, used for invitations, billing emails, and (future) passwordless
auth and notifications.

**New table — delivery tracking:**
```sql
-- email_events
id                   uuid pk
org_id               uuid
recipient            text
template             text
status               text   -- queued | sent | delivered | bounced | failed
provider_message_id  text
created_at           timestamptz
```
Resend delivery webhooks update `status`. This gives an auditable trail for "was the invite
actually delivered?" — important once teams depend on email invites (§30).

---

# 30. Invitation Flow (v4 — concrete wiring of §3.2)

This is the §3.2 flow with the email provider and audit trail bound in:
```
INVITE
  Org admin enters email
    → create org_invites row (role, optional workspace_grants)
    → generate token, store token_hash, email raw token via Resend
    → record email_events row

ACCEPT
  User clicks link → login / signup (Better Auth)
    → verify hash(token) == token_hash, status='pending', not expired
    → transaction: insert org_members; insert workspace_members (grants);
      mark org_invites accepted, set accepted_by
    → audit_log: member.invite_accepted
```
All the integrity rules from §3.2 still hold (hashed single-use tokens, expiry, idempotent
re-accept, invite-by-email-not-user-id).

---

# 31. Queue Consumer Architecture — Pull-Based Fastify Workers (v4)

**Cloudflare Queues are kept; Cloudflare Workers are removed as consumers.** Instead of push
delivery into a Worker, our own **Fastify worker process pulls** from Cloudflare Queues using the
**HTTP Pull consumer API**. This keeps all backend logic in one TypeScript/Fastify codebase on
our own hosts (§2), avoids the Workers runtime's constraints, and makes local dev/debugging
straightforward.

**Three process types (same repo, different entrypoints):**
```bash
pnpm start:api             # Fastify HTTP API (user-facing requests)
pnpm start:queue-worker    # pull consumer loop (below)
pnpm start:scheduler       # cron: enqueues time-based jobs
```

**Pull consumer loop (`queue-worker`):**
```
loop:
  batch = POST https://api.cloudflare.com/.../queues/{id}/messages/pull
          { visibility_timeout_ms, batch_size }       # leased, hidden from other pullers
  if batch empty → short backoff, continue
  for each message:
     process handler (idempotent — §5.5/§21)
     on success → collect message lease_id for ack
     on retryable failure → collect for retry (or just let visibility timeout lapse)
  POST .../messages/ack  { acks:[lease_ids], retries:[lease_ids] }
```
Key properties:
- **Visibility timeout = the lease.** A crashed worker's messages reappear after the timeout, so
  Cloudflare's own redelivery plus our §24 DB-lease recovery cover both the queue layer and the
  job row. Two complementary safety nets.
- **At-least-once + idempotent handlers** → the v4 principle holds even with redelivery.
- **Backpressure** is controlled by `batch_size` and the loop's concurrency, tuned per queue
  (small batches for `publish_queue`, larger for `backfill_queue`).
- After max retries, Cloudflare routes to the queue's dead-letter target → `dead_letter_jobs`
  (§5.8), unchanged.

**`queue-worker` consumes:** `publish_queue`, `scheduled_publish_queue`, `analytics_queue`,
`sync_posts_queue`, `webhook_queue`, `backfill_queue`.

**`scheduler` creates jobs:** adaptive analytics sync (§23), plan reconciliation (§18), token
refresh (§11), lease recovery (§24), retention/snapshot cleanup (§22). It only enqueues; the
`queue-worker` does the work.

Required env additions (appended to §19):
```bash
CF_QUEUES_PULL_ENDPOINT=https://api.cloudflare.com/client/v4/accounts/{acct}/queues
QUEUE_VISIBILITY_TIMEOUT_MS=900000     # 15m — aligns with the §24 job lease
QUEUE_PULL_BATCH_SIZE=10
LEASE_RECOVERY_CRON=*/5 * * * *        # §24 recovery worker, every 5 min
```

---

# 32. Final Principles (v4)

**Priority ordering (from v1, still in force):** Publishing reliability > Analytics > Historical
imports > AI features. The product must always be able to publish even if analytics, backfills,
or AI are temporarily unavailable.

**Consistency model (v4):** Social APIs are eventually consistent; **PostgreSQL is
authoritative.** Any successful publish our system performs must update our database immediately
(§21), without waiting for synchronization. Synchronization exists only to reconcile changes that
happened *outside* our platform (§28). This keeps the dashboard truthful in real time while still
healing from external drift.

---

## Appendix A — Gap-to-Fix Map (for reviewer)
| # | Gap | Fix (section) |
|---|-----------|-------|
| 1 | `oauth_states` referenced, never defined | §5.1 full schema, single-use + expiry |
| 2 | Publish retries can double-post | §5.5 idempotency_key + write-before-ack reconciliation |
| 3 | `media` had no processing status | §5.4 status (uploading/ready/failed) + publish gate §9 |
| 4 | DLQ named but not modeled | §5.8 `dead_letter_jobs` + replay/alert |
| 5 | `posts.status` couldn't express partial publish | §5.3 derived status incl. `partial` |
| 6 | Scheduling flow contradicted the queue set | §8 dedicated `scheduled_publish_queue`, shared consumer |
| 7 | Rate-limit key too coarse (per platform) | §12 per `social_account_id`, advisory KV |
| 8 | No webhook signature verification | §10 verify-before-enqueue |
| 9 | sync timing tracked in two places | §5.7 `sync_state` authoritative, columns are mirrors |
| 10 | Disconnect cleanup undefined | §13 full teardown + KV invalidation |
| 11 | Teams/org membership unspecified | §3 org/workspace split, invites, roles, authz, multi-org |
| 12 | No accountability for team actions | §5.9 `audit_log` |
| 13 | Plan limits stated but enforcement undefined | §16 `plan_limits` table, sync pre-action gate, async retention job, downgrade/past-due policy |
| 14 | No payment provider / billing tables | §17 Razorpay: billing_customers, subscriptions, orders, payments, refunds, webhook_events; webhook-authoritative flow |
| 15 | No configuration/secrets reference | §19 `.env` with all required variables, client-vs-server secret notes |
| 16 | Plan expiry: no lifecycle, risk of month-end batch + scattered checks | §18 single `plan_status` flag, two writers (webhook + daily reconciliation job), pure-reader enforcement middleware, verify-before-expire safeguard |
| 17 | Dashboard lag after publish (sync-only mirror) | §21 immediate `platform_posts` upsert on publish |
| 18 | No metric history → no trend charts | §22 append-only `post_metric_snapshots`, Agency retention 365d |
| 19 | Flat 6h analytics sync wasteful | §23 adaptive hot/warm/cold cadence, 80–95% API reduction |
| 20 | Crashed consumer leaves job stuck `running` | §24 `processing_started_at`/`lease_expires_at` + 5-min recovery worker |
| 21 | Ambiguous `scheduled_for` | §25 `scheduled_for_utc` + `scheduled_timezone`, store UTC |
| 22 | Duplicate media inflates R2 | §26 mandatory SHA-256 checksum dedup, per-org scope |
| 23 | No account health signal | §27 `health_status` (healthy/warning/broken) + last error fields |
| 24 | 6h lag on external changes | §28 webhook-first sync, polling as fallback |
| 25 | Email provider unspecified, no delivery trail | §29 Resend + `email_events` |
| 26 | Consumer runtime (Cloudflare Workers) vs single codebase | §31 pull-based Fastify worker over Queues HTTP Pull API; Workers removed |
