import { useOrg } from '../../lib/org-context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@postpilot/ui'

export function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrgId } = useOrg()

  if (orgs.length === 0) return null

  return (
    <Select value={activeOrg?.id ?? ''} onValueChange={setActiveOrgId}>
      <SelectTrigger className="h-9 rounded-xl border-border/70 bg-background/90 px-3 text-sm shadow-sm shadow-black/5">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
