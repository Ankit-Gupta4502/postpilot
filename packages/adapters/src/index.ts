import type { PlatformAdapter } from './base'
import { InstagramAdapter } from './instagram'
import { FacebookAdapter } from './facebook'
import { LinkedInAdapter } from './linkedin'
import { XAdapter } from './x'
import { YouTubeAdapter } from './youtube'

export type {
  PlatformAdapter,
  ConnectResult,
  RefreshResult,
  PublishInput,
  PublishResult,
  SyncPostsResult,
  SyncedPost,
  AnalyticsSnapshot,
  WebhookEvent,
} from './base'

type Platform = 'instagram' | 'facebook' | 'linkedin' | 'x' | 'youtube'

const registry: Record<Platform, PlatformAdapter> = {
  instagram: new InstagramAdapter(),
  facebook: new FacebookAdapter(),
  linkedin: new LinkedInAdapter(),
  x: new XAdapter(),
  youtube: new YouTubeAdapter(),
}

export function getAdapter(platform: string): PlatformAdapter {
  const adapter = registry[platform as Platform]
  if (!adapter) throw new Error(`No adapter registered for platform: ${platform}`)
  return adapter
}
