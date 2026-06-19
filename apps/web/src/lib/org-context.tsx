import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from './auth-client'
import { apiFetch } from './api'
import { storage } from './storage'

/**
 * Auto-selects the first org (if none stored) and the first workspace
 * (if none stored or after an org switch). Combines both effects in one
 * hook so OrgProvider stays clean.
 */
function useAutoSelect(
  orgs: Org[],
  activeOrgId: string | null,
  setOrgId: (id: string) => void,
  workspaces: Workspace[],
  activeWorkspaceId: string | null,
  setWorkspaceId: (id: string) => void,
) {
  useEffect(() => {
    if (orgs.length > 0 && !activeOrgId) {
      const id = orgs[0]!.id
      setOrgId(id)
      storage.set('activeOrgId', id)
    }
  }, [orgs, activeOrgId])

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      const id = workspaces[0]!.id
      setWorkspaceId(id)
      storage.set('activeWorkspaceId', id)
    }
  }, [workspaces, activeWorkspaceId])
}

export interface Org {
  id: string
  name: string
  slug: string
  plan: string
  planStatus: string
  role: string
}

export interface Workspace {
  id: string
  name: string
  orgId: string
}

interface OrgContextValue {
  orgs: Org[]
  activeOrg: Org | null
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  setActiveOrgId: (id: string) => void
  setActiveWorkspaceId: (id: string) => void
  isLoading: boolean
}

const OrgContext = createContext<OrgContextValue>({
  orgs: [],
  activeOrg: null,
  workspaces: [],
  activeWorkspace: null,
  setActiveOrgId: () => {},
  setActiveWorkspaceId: () => {},
  isLoading: true,
})

export function OrgProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()

  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(
    () => storage.get('activeOrgId')
  )
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => storage.get('activeWorkspaceId')
  )

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => apiFetch<Org[]>('/api/orgs'),
    enabled: !!session?.user,
  })

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null

  const { data: workspaces = [], isLoading: wsLoading } = useQuery({
    queryKey: ['workspaces', activeOrg?.id],
    queryFn: () => apiFetch<Workspace[]>('/api/workspaces', { orgId: activeOrg!.id }),
    enabled: !!activeOrg,
  })

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null

  useAutoSelect(
    orgs, activeOrgId, setActiveOrgIdState,
    workspaces, activeWorkspaceId, setActiveWorkspaceIdState,
  )

  function setActiveOrgId(id: string) {
    setActiveOrgIdState(id)
    storage.set('activeOrgId', id)
    // Clear workspace so the new org's first workspace is auto-selected
    setActiveWorkspaceIdState(null)
    storage.remove('activeWorkspaceId')
  }

  function setActiveWorkspaceId(id: string) {
    setActiveWorkspaceIdState(id)
    storage.set('activeWorkspaceId', id)
  }

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrg,
        workspaces,
        activeWorkspace,
        setActiveOrgId,
        setActiveWorkspaceId,
        isLoading: orgsLoading || wsLoading,
      }}
    >
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  return useContext(OrgContext)
}
