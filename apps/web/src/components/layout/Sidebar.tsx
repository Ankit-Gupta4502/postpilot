import { LayoutDashboard, PenLine, Users, Briefcase, Settings, LogOut } from 'lucide-react'
import { signOut, useSession } from '../../lib/auth-client'
import { OrgSwitcher } from './OrgSwitcher'
import { NavLink } from './NavLink'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { to: '/compose', label: 'New Post', icon: <PenLine size={15} /> },
  { to: '/accounts', label: 'Social Accounts', icon: <Users size={15} /> },
  { to: '/workspaces', label: 'Workspaces', icon: <Briefcase size={15} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={15} /> },
] satisfies { to: string; label: string; icon: React.ReactNode }[]

export function Sidebar() {
  const { data: session } = useSession()
  const name = session?.user?.name ?? ''
  const email = session?.user?.email ?? ''
  const initials = name
    ? name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    : email[0]?.toUpperCase() ?? '?'

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2.5 border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M12 5l7 7-7 7"/>
          </svg>
        </div>
        <span className="text-base font-semibold tracking-tight">PostPilot</span>
      </div>

      <div className="border-b px-3 py-3">
        <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">Workspace</p>
        <OrgSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}
      </nav>

      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {name && <p className="truncate text-xs font-semibold leading-tight">{name}</p>}
            <p className="truncate text-xs text-muted-foreground leading-tight">{email}</p>
          </div>
          <button
            onClick={() =>
              signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login' } } })
            }
            title="Sign out"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
