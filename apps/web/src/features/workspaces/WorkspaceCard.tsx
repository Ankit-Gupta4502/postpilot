import { Briefcase } from 'lucide-react'
import { Badge } from '@postpilot/ui'

interface Workspace {
  id: string
  name: string
  role: string
  createdAt?: string | null
}

interface WorkspaceCardProps {
  workspace: Workspace
  isActive?: boolean
  onSelect?: (id: string) => void
}

export function WorkspaceCard({ workspace, isActive, onSelect }: WorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(workspace.id)}
      className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
        isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Briefcase size={18} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{workspace.name}</p>
        <p className="text-sm text-muted-foreground capitalize">{workspace.role}</p>
      </div>
      {isActive && (
        <Badge variant="secondary" className="shrink-0">
          Active
        </Badge>
      )}
    </button>
  )
}
