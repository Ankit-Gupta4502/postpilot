import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@postpilot/ui'
import { apiFetch } from '../../lib/api'
import { localToUTC, getDefaultTimezone } from '../../lib/timezone'
import { PlatformSelector } from '../accounts/PlatformSelector'
import { MediaUploader, type UploadedMedia } from './MediaUploader'
import { ScheduleField } from './ScheduleField'
import { HashtagInput } from './HashtagInput'

const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  youtube: 5000,
}

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
}

interface Account {
  id: string
  platform: string
  displayName: string | null
  username: string | null
  status: string
  healthStatus?: string
}

interface ComposerFormProps {
  workspaceId: string
  orgId: string
  accounts: Account[]
}

export function ComposerForm({ workspaceId, orgId, accounts }: ComposerFormProps) {
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [uploads, setUploads] = useState<UploadedMedia[]>([])
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [timezone, setTimezone] = useState(getDefaultTimezone)

  const selectedAccounts = accounts.filter((a) => selectedIds.includes(a.id))
  const selectedPlatforms = [...new Set(selectedAccounts.map((a) => a.platform))]

  // Build the final content string (content + hashtags appended)
  const hashtagSuffix = hashtags.length > 0 ? '\n\n' + hashtags.map((t) => `#${t}`).join(' ') : ''
  const fullContent = content + hashtagSuffix

  // Per-platform char counts
  const platformCounts = selectedPlatforms.map((p) => ({
    platform: p,
    limit: PLATFORM_LIMITS[p] ?? 63206,
    count: fullContent.length,
    over: fullContent.length > (PLATFORM_LIMITS[p] ?? 63206),
  }))

  const anyOverLimit = platformCounts.some((p) => p.over)

  // Show hashtag section only when a single platform is selected (for the tag limit hint)
  const singlePlatform = selectedPlatforms.length === 1 ? selectedPlatforms[0] : undefined

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>('/api/posts', {
        method: 'POST',
        orgId,
        body: JSON.stringify({
          workspaceId,
          content: fullContent,
          accountIds: selectedIds,
          scheduledFor:
            scheduleEnabled && scheduledAt ? localToUTC(scheduledAt, timezone) : undefined,
          timezone: scheduleEnabled ? timezone : undefined,
          mediaIds: uploads.map((u) => u.mediaId),
        }),
      }),
    onSuccess: () => navigate({ to: '/dashboard' }),
  })

  const canSubmit =
    content.trim().length > 0 &&
    selectedIds.length > 0 &&
    !anyOverLimit &&
    !mutation.isPending &&
    (!scheduleEnabled || scheduledAt.length > 0)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate() }}
      className="space-y-6"
    >
      {/* Account selector */}
      <div>
        <label className="mb-2 block text-sm font-medium">Post to</label>
        <PlatformSelector accounts={accounts} selectedIds={selectedIds} onChange={setSelectedIds} />
      </div>

      {/* Content textarea */}
      <div>
        <label className="mb-2 block text-sm font-medium">Caption</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to share?"
          rows={5}
          className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />

        {/* Per-platform char count breakdown */}
        {platformCounts.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {platformCounts.map(({ platform, limit, count, over }) => (
              <span
                key={platform}
                className={`text-xs ${over ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
              >
                {PLATFORM_LABEL[platform] ?? platform}: {count}/{limit}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hashtags */}
      <div>
        <label className="mb-2 block text-sm font-medium">Hashtags</label>
        <HashtagInput
          tags={hashtags}
          onChange={setHashtags}
          platform={singlePlatform}
        />
      </div>

      {/* Media */}
      <div>
        <label className="mb-2 block text-sm font-medium">Media</label>
        <MediaUploader
          orgId={orgId}
          uploads={uploads}
          onUpload={(m) => setUploads((prev) => [...prev, m])}
          onRemove={(id) => setUploads((prev) => prev.filter((u) => u.mediaId !== id))}
        />
      </div>

      {/* Schedule */}
      <ScheduleField
        enabled={scheduleEnabled}
        onToggle={() => setScheduleEnabled((v) => !v)}
        scheduledAt={scheduledAt}
        timezone={timezone}
        onScheduledAtChange={setScheduledAt}
        onTimezoneChange={setTimezone}
      />

      {mutation.isError && (
        <p className="text-sm text-destructive">
          {(mutation.error as Error)?.message ?? 'Something went wrong'}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {mutation.isPending
            ? scheduleEnabled ? 'Scheduling…' : 'Publishing…'
            : scheduleEnabled ? 'Schedule' : 'Publish now'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: '/dashboard' })}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
