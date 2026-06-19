import { Plus } from 'lucide-react'
import { PlatformIcon } from './PlatformIcon'

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  youtube: 'YouTube',
}

interface ConnectPlatformButtonProps {
  platform: string
  workspaceId: string
  apiBaseUrl: string
}

export function ConnectPlatformButton({ platform, workspaceId, apiBaseUrl }: ConnectPlatformButtonProps) {
  const label = PLATFORM_LABELS[platform] ?? platform

  return (
    <button
      type="button"
      onClick={() => { window.location.href = `${apiBaseUrl}/oauth/${platform}/init?workspaceId=${workspaceId}` }}
      className="group flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-card px-3 py-5 text-center shadow-sm transition-all hover:border-primary/30 hover:bg-accent/40 hover:shadow-md cursor-pointer"
    >
      <PlatformIcon platform={platform} size="lg" />
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="mt-1 flex items-center justify-center gap-0.5 text-xs text-muted-foreground group-hover:text-primary transition-colors">
          <Plus size={11} />
          Connect
        </p>
      </div>
    </button>
  )
}
