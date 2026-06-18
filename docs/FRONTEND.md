# Frontend Guide

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (SSR) + TanStack Router (file-based) |
| Styling | Tailwind CSS v4 (CSS-first, no `tailwind.config.js`) |
| Components | shadcn/ui (new-york style) via `@postpilot/ui` |
| Icons | lucide-react |
| Data fetching | TanStack Query |
| Auth | better-auth client |

---

## Directory Structure

```
apps/web/src/
  components/
    layout/          ← app chrome only (Shell, Sidebar, NavLink, OrgSwitcher)
  features/
    auth/            ← login/register forms (EmailSignInForm, EmailSignUpForm, GoogleSignInButton)
    accounts/        ← social account domain (PlatformIcon, AccountCard, ConnectPlatformButton, HealthBadge, PlatformCheckbox, PlatformSelector)
    compose/         ← post creation domain (ComposerForm, MediaUploader, ScheduleField, TimezoneSelect)
    workspaces/      ← workspace management (WorkspaceCard, CreateWorkspaceForm)
    settings/        ← org settings tabs (MembersTab, InvitesTab, BillingTab)
  routes/            ← thin pages: pull from features, wire data, render Shell
  lib/               ← api client, auth client, org context, timezone utils
```

**Rule:** a component lives in the feature folder that _owns_ it.  
`components/layout/` is for cross-app chrome only — sidebar, shell, nav links.  
New domains get a new `features/<domain>/` folder — never dump into a flat `components/`.

---

## Adding a shadcn Component

Run from **`packages/ui/`** (not the app):

```bash
cd packages/ui
npx shadcn@latest add <component-name>
```

Components land in `packages/ui/src/components/`. They are exported from `packages/ui/src/index.ts` and consumed across the monorepo via `import { X } from '@postpilot/ui'`.

---

## Tailwind v4 Rules

### One `@import "tailwindcss"` — in the app, not the package

`apps/web/src/globals.css` owns the Tailwind entrypoint. The shared `@postpilot/ui/globals.css` provides only `@theme` variables — it must **not** re-import tailwindcss.

```css
/* apps/web/src/globals.css — correct */
@import "tailwindcss";
@source "../../../packages/ui/src/**/*.{ts,tsx}";   ← scan workspace package
@import "@postpilot/ui/globals.css";                ← theme variables only
```

### `@source` for workspace packages

Tailwind v4's Vite plugin skips `node_modules`, including pnpm workspace symlinks. Any workspace package whose source contains Tailwind classes **must** be explicitly sourced:

```css
@source "../../../packages/ui/src/**/*.{ts,tsx}";
```

If you add another package with Tailwind classes, add another `@source` line.

### Theme variables

All design tokens live in `packages/ui/src/globals.css` inside `@theme {}`. To change a color or radius, edit that file — do not hard-code arbitrary values in components.

```css
/* packages/ui/src/globals.css */
@theme {
  --color-primary: oklch(0.511 0.247 264);  /* indigo-600 */
  --radius: 0.625rem;
  /* ... */
}
```

Tailwind generates utility classes from these: `bg-primary`, `text-primary`, `rounded-lg`, etc.

---

## Icons

Always import from `lucide-react`. Never write inline SVG in component files.

```tsx
import { LayoutDashboard, LogOut } from 'lucide-react'

<LayoutDashboard size={16} />
```

Exceptions: the PostPilot logo mark (one-off brand SVG kept in `Sidebar.tsx`). Platform brand icons (`Instagram`, `Facebook`, etc.) also come from lucide — see `features/accounts/PlatformIcon.tsx`.

---

## Component Rules

- **One component per file.** No exceptions.
- No default exports — always named exports.
- Props interfaces stay in the same file as the component.
- No inline style objects — use Tailwind classes only.
- No `className` concatenation with template literals — use `cn()` from `@postpilot/ui`.

---

## Data Fetching Pattern

Routes fetch data with TanStack Query. The query lives in the route file, not inside the feature component. Feature components receive data as props.

```tsx
// routes/accounts.tsx — fetch here
const { data: accounts = [] } = useQuery({ ... })

// features/accounts/AccountCard.tsx — receive as props
export function AccountCard({ account }: { account: Account }) { ... }
```

Mutations (create, update, delete) live in the feature component that owns the action, since they are tightly coupled to the UI state (loading, error, optimistic update).

---

## Auth & Org Context

- `useSession()` — current user session (better-auth)
- `useOrg()` — active org + workspace, org list, `setActiveOrgId()`

Both are available anywhere under `<OrgProvider>` (mounted in `__root.tsx`).

API calls always pass `orgId` in the options:

```tsx
apiFetch('/api/posts', { orgId: activeOrg.id })
```

---

## Route File Shape

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Shell } from '../components/layout/Shell'
import { FeatureComponent } from '../features/domain/FeatureComponent'

export const Route = createFileRoute('/path')({ component: Page })

function Page() {
  const { activeOrg, activeWorkspace } = useOrg()
  const { data } = useQuery({ ... })

  return (
    <Shell>
      <h1>Title</h1>
      <FeatureComponent data={data} />
    </Shell>
  )
}
```
