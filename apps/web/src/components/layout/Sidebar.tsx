import { useState } from 'react'
import {
  LayoutDashboard,
  PenLine,
  Users,
  Briefcase,
  Settings,
  LogOut,
  BarChart2,
  ShieldAlert,
  Search,
  Check,
} from 'lucide-react'
import { signOut, useSession } from '../../lib/auth-client'
import { OrgSwitcher } from './OrgSwitcher'
import { NavLink } from './NavLink'
import { useOrg } from '../../lib/org-context'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@postpilot/ui'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { to: '/compose', label: 'New Post', icon: <PenLine size={15} /> },
  { to: '/accounts', label: 'Social Accounts', icon: <Users size={15} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
  { to: '/workspaces', label: 'Workspaces', icon: <Briefcase size={15} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={15} /> },
  { to: '/admin', label: 'Admin', icon: <ShieldAlert size={15} /> },
] satisfies { to: string; label: string; icon: React.ReactNode }[]

export function Sidebar() {
  const { data: session } = useSession()
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useOrg()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const name = session?.user?.name ?? ''
  const email = session?.user?.email ?? ''
  const initials = name
    ? name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    : email[0]?.toUpperCase() ?? '?'

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-border/70 bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="border-b border-border/70 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">PostPilot</p>
            <p className="truncate text-[11px] text-muted-foreground">Plan and publish</p>
          </div>
        </div>
      </div>

      <div className="border-b border-border/70 px-3 py-3">
        <div className="space-y-2">
          <OrgSwitcher />

          <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl border border-border/70 bg-background/90 px-2.5 py-2 text-left text-sm transition-colors hover:bg-background"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Briefcase size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">
                    {activeWorkspace?.name ?? 'Select workspace'}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground leading-tight">
                    {activeWorkspace?.role ?? 'Workspace'}
                  </p>
                </div>
                <Search size={13} className="shrink-0 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-2">
              <Command className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                <CommandInput placeholder="Search workspaces" />
                <CommandList>
                  <CommandEmpty>No matching workspaces</CommandEmpty>
                  <CommandGroup heading="Workspaces">
                    {workspaces.map((workspace) => {
                      const active = workspace.id === activeWorkspace?.id
                      return (
                        <CommandItem
                          key={workspace.id}
                          value={`${workspace.name} ${workspace.role}`}
                          onSelect={() => {
                            setActiveWorkspaceId(workspace.id)
                            setWorkspaceOpen(false)
                          }}
                          className="gap-2.5"
                        >
                          <span className={[
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                            active ? 'border-primary/20 bg-primary text-primary-foreground' : 'border-border/70 bg-muted text-muted-foreground',
                          ].join(' ')}>
                            <Briefcase size={13} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium leading-tight">{workspace.name}</span>
                            <span className="block truncate text-[10px] text-muted-foreground leading-tight">{workspace.role}</span>
                          </span>
                          {active && <Check size={13} className="shrink-0 text-primary" />}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
          ))}
        </div>
      </nav>

      <div className="border-t border-border/70 px-3 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {name && <p className="truncate text-sm font-medium leading-tight">{name}</p>}
            <p className="truncate text-[10px] text-muted-foreground leading-tight">{email}</p>
          </div>
          <button
            onClick={() =>
              signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login' } } })
            }
            title="Sign out"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
