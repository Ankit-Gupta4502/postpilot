import { Button } from '@postpilot/ui'
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
    <Button
      variant="outline"
      className="gap-2.5"
      onClick={() => { window.location.href = `${apiBaseUrl}/oauth/${platform}/init?workspaceId=${workspaceId}` }}
    >
      <PlatformIcon platform={platform} size="sm" />
      Connect {label}
    </Button>
  )
}
