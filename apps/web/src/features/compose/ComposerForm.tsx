import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@postpilot/ui'
import { apiFetch } from '../../lib/api'
import { PlatformSelector } from '../accounts/PlatformSelector'
import { Sparkles } from 'lucide-react'
import { MediaUploader, type UploadedMedia } from './MediaUploader'

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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [uploads, setUploads] = useState<UploadedMedia[]>([])

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>('/api/posts', {
        method: 'POST',
        orgId,
        data: {
          workspaceId,
          content: content.trim(),
          accountIds: selectedIds,
          mediaIds: uploads.map((media) => media.mediaId),
        },
      }),
    onSuccess: () => navigate({ to: '/dashboard' }),
  })

  const canSubmit =
    content.trim().length > 0 &&
    selectedIds.length > 0 &&
    !mutation.isPending

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) mutation.mutate()
      }}
      className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
    >
      <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm xl:order-1">
        <CardHeader className="border-b border-border/60 bg-gradient-to-r from-sky-500/5 to-transparent py-3">
          <CardTitle className="text-base">Accounts</CardTitle>
          <CardDescription className="text-xs">Pick connected accounts.</CardDescription>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-4">
          <PlatformSelector accounts={accounts} selectedIds={selectedIds} onChange={setSelectedIds} />
        </CardContent>
      </Card>

      <div className="space-y-4 xl:order-2">
        <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles size={16} className="text-primary" />
              Content
            </CardTitle>
            <CardDescription className="text-xs">Write the post text.</CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Post text</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post..."
              rows={6}
              className="flex w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3.5 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {content.trim().length === 0 ? 'Start typing to enable publish.' : `${content.trim().length} characters`}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-sky-500/5 to-transparent py-3">
            <CardTitle className="text-base">Media</CardTitle>
            <CardDescription className="text-xs">Upload images or videos.</CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4">
            <MediaUploader
              orgId={orgId}
              uploads={uploads}
              onUpload={(media) => setUploads((prev) => [...prev, media])}
              onRemove={(mediaId) => setUploads((prev) => prev.filter((item) => item.mediaId !== mediaId))}
            />
          </CardContent>
        </Card>

        {mutation.isError && (
          <p className="rounded-2xl border border-red-200/70 bg-red-50/70 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300">
            {(mutation.error as Error)?.message ?? 'Something went wrong'}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={!canSubmit} className="sm:w-auto">
            {mutation.isPending ? 'Publishing…' : 'Publish now'}
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
      </div>
    </form>
  )
}
