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
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-muted/80 text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
          active
            ? 'bg-primary/10 text-primary'
            : 'bg-muted/70 text-muted-foreground group-hover:bg-card group-hover:text-foreground'
        }`}
      >
        {icon}
      </span>
      <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}
