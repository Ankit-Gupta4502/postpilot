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
      className="group flex w-full flex-col items-start gap-3 rounded-3xl border border-border/70 bg-card/90 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        <PlatformIcon platform={platform} size="lg" />
        <div>
          <p className="text-sm font-semibold leading-tight">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">Connect and start publishing from one workspace.</p>
        </div>
      </div>
      <p className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
        <Plus size={11} />
        Connect
      </p>
    </button>
  )
}
