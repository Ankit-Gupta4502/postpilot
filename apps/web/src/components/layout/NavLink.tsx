import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'

interface NavLinkProps {
  to: string
  label: string
  icon?: ReactNode
}

export function NavLink({ to, label, icon }: NavLinkProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}
