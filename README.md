# PostPilot

Social media management platform — schedule, publish, and analyze content across platforms.

## Stack
- **Frontend**: TanStack Start, React 19, Tailwind v4, shadcn/ui
- **Backend**: Fastify v5, Better Auth, Drizzle ORM
- **Database**: PostgreSQL (Supabase)
- **Queue**: Cloudflare Queues (HTTP Pull API)
- **Storage**: Cloudflare R2
- **Email**: Resend
- **Billing**: Razorpay

## Monorepo Structure
```
apps/
  web/           # TanStack Start frontend
  api/           # Fastify HTTP API
  queue-worker/  # Cloudflare Queues pull consumer
  scheduler/     # Cron job runner
packages/
  db/            # Drizzle schema + client
  ui/            # Shared shadcn/ui components
  shared/        # Shared types and utilities
docs/
  ARCHITECTURE.md
  PROGRESS.md
```

## Getting Started
```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Process Types
```bash
pnpm dev:api      # Fastify API server (port 8080)
pnpm dev:web      # TanStack Start frontend (port 3000)
pnpm dev:worker   # Queue consumer
```
