import { useEffect, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useSession } from '../lib/auth-client'
import { useAuthStore } from '../lib/auth-store'

/**
 * Routes that don't require a session.
 * '/' is included so unauthenticated users see the landing page;
 * authenticated users hitting '/' are still redirected to /dashboard.
 */
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password'])

/**
 * Single auth guard mounted once in __root.tsx.
 * - Unauthenticated users hitting a protected route → /login
 * - Authenticated users hitting a public route → /dashboard
 * No per-route code needed.
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { setSession, setHydrated } = useAuthStore()

  const isPublic = PUBLIC_PATHS.has(pathname)

  useEffect(() => {
    if (isPending) return

    const user = session?.user ?? null
    setSession(user ? { id: user.id, name: user.name, email: user.email } : null)
    setHydrated()

    if (!user && !isPublic) {
      navigate({ to: '/login', replace: true })
    } else if (user && isPublic) {
      navigate({ to: '/dashboard', replace: true })
    }
  }, [isPending, session, isPublic])

  // While the first session check is in flight, show nothing (avoids flash)
  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
