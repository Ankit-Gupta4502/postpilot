import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@postpilot/ui'
import { Shell } from '../components/layout/Shell.js'
import { MembersTab } from '../features/settings/MembersTab.js'
import { InvitesTab } from '../features/settings/InvitesTab.js'
import { BillingTab } from '../features/settings/BillingTab.js'
import { useOrg } from '../lib/org-context.js'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { activeOrg } = useOrg()

  if (!activeOrg) {
    return (
      <Shell>
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">No organization selected.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Org Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">{activeOrg.name}</p>
        </div>

        <Tabs defaultValue="members">
          <TabsList className="mb-6">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="members">
            <MembersTab orgId={activeOrg.id} orgRole={activeOrg.role} />
          </TabsContent>
          <TabsContent value="invites">
            <InvitesTab orgId={activeOrg.id} orgRole={activeOrg.role} />
          </TabsContent>
          <TabsContent value="billing">
            <BillingTab org={activeOrg} />
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  )
}
