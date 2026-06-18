import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Shell } from '../components/layout/Shell.js'
import { MembersTab } from '../features/settings/MembersTab.js'
import { InvitesTab } from '../features/settings/InvitesTab.js'
import { BillingTab } from '../features/settings/BillingTab.js'
import { useOrg } from '../lib/org-context.js'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

type Tab = 'members' | 'invites' | 'billing'

const TABS: { id: Tab; label: string }[] = [
  { id: 'members', label: 'Members' },
  { id: 'invites', label: 'Invites' },
  { id: 'billing', label: 'Billing' },
]

function SettingsPage() {
  const { activeOrg } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('members')

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

        <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'members' && (
          <MembersTab orgId={activeOrg.id} orgRole={activeOrg.role} />
        )}
        {activeTab === 'invites' && (
          <InvitesTab orgId={activeOrg.id} orgRole={activeOrg.role} />
        )}
        {activeTab === 'billing' && (
          <BillingTab org={activeOrg} />
        )}
      </div>
    </Shell>
  )
}
