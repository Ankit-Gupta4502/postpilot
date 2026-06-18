import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from './auth-client'
import { apiFetch } from './api'

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
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('activeOrgId') : null
  )
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null
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

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null

  useEffect(() => {
    if (orgs.length > 0 && !activeOrgId) {
      const id = orgs[0]!.id
      setActiveOrgIdState(id)
      localStorage.setItem('activeOrgId', id)
    }
  }, [orgs, activeOrgId])

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      const id = workspaces[0]!.id
      setActiveWorkspaceIdState(id)
      localStorage.setItem('activeWorkspaceId', id)
    }
  }, [workspaces, activeWorkspaceId])

  function setActiveOrgId(id: string) {
    setActiveOrgIdState(id)
    localStorage.setItem('activeOrgId', id)
    setActiveWorkspaceIdState(null)
    localStorage.removeItem('activeWorkspaceId')
  }

  function setActiveWorkspaceId(id: string) {
    setActiveWorkspaceIdState(id)
    localStorage.setItem('activeWorkspaceId', id)
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
