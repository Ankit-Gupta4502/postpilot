import { useEffect, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useSession } from '../lib/auth-client'
import { useAuthStore } from '../lib/auth-store'
import { useOrg } from '../lib/org-context'

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password'])

export function RouteGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const { isOnboarded, isLoading: orgLoading } = useOrg()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { setSession, setHydrated } = useAuthStore()

  const isPublic = PUBLIC_PATHS.has(pathname)
  const isOnboarding = pathname === '/onboarding'

  useEffect(() => {
    if (isPending) return

    const user = session?.user ?? null
    setSession(user ? { id: user.id, name: user.name, email: user.email } : null)
    setHydrated()

    if (!user && !isPublic) {
      navigate({ to: '/login', replace: true })
      return
    }

    if (user && isPublic) {
      navigate({ to: '/dashboard', replace: true })
      return
    }

    // Wait for org data before checking onboarding state
    if (user && orgLoading) return

    if (user && !isOnboarded && !isOnboarding) {
      navigate({ to: '/onboarding', replace: true })
    }
  }, [isPending, session, isPublic, isOnboarding, isOnboarded, orgLoading])

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
