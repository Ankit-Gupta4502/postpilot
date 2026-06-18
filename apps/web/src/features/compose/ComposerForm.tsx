import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@postpilot/ui'
import { apiFetch } from '../../lib/api'
import { localToUTC, getDefaultTimezone } from '../../lib/timezone'
import { PlatformSelector } from '../accounts/PlatformSelector'
import { MediaUploader, type UploadedMedia } from './MediaUploader'
import { ScheduleField } from './ScheduleField'

const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  youtube: 5000,
}

interface Account {
  id: string
  platform: string
  displayName: string | null
  username: string | null
  status: string
}

interface ComposerFormProps {
  workspaceId: string
  orgId: string
  accounts: Account[]
}

export function ComposerForm({ workspaceId, orgId, accounts }: ComposerFormProps) {
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [uploads, setUploads] = useState<UploadedMedia[]>([])
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [timezone, setTimezone] = useState(getDefaultTimezone)

  const selectedPlatforms = accounts
    .filter((a) => selectedIds.includes(a.id))
    .map((a) => a.platform)

  const charLimit =
    selectedPlatforms.length > 0
      ? Math.min(...selectedPlatforms.map((p) => PLATFORM_LIMITS[p] ?? 63206))
      : null

  const overLimit = charLimit !== null && content.length > charLimit

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>('/api/posts', {
        method: 'POST',
        orgId,
        body: JSON.stringify({
          workspaceId,
          content,
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
    !overLimit &&
    !mutation.isPending &&
    (!scheduleEnabled || scheduledAt.length > 0)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate() }}
      className="space-y-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">Post to</label>
        <PlatformSelector accounts={accounts} selectedIds={selectedIds} onChange={setSelectedIds} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to share?"
          rows={5}
          className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {charLimit !== null && (
          <p className={`mt-1 text-right text-xs ${overLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
            {content.length} / {charLimit}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Media</label>
        <MediaUploader
          orgId={orgId}
          uploads={uploads}
          onUpload={(m) => setUploads((prev) => [...prev, m])}
          onRemove={(id) => setUploads((prev) => prev.filter((u) => u.mediaId !== id))}
        />
      </div>

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
