import { ChevronDown } from 'lucide-react'
import { useOrg } from '../../lib/org-context'

export function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrgId } = useOrg()

  if (orgs.length === 0) return null

  return (
    <div className="relative">
      <select
        value={activeOrg?.id ?? ''}
        onChange={(e) => setActiveOrgId(e.target.value)}
        className="w-full appearance-none rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-xs font-medium text-foreground shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
