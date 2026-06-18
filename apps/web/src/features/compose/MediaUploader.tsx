import { useRef } from 'react'
import { Paperclip, X } from 'lucide-react'
import { Button } from '@postpilot/ui'

export interface UploadedMedia {
  mediaId: string
  url: string
  mimeType: string
}

interface MediaUploaderProps {
  orgId: string
  uploads: UploadedMedia[]
  onUpload: (media: UploadedMedia) => void
  onRemove: (mediaId: string) => void
}

export function MediaUploader({ orgId, uploads, onUpload, onRemove }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'X-Org-Id': orgId },
          credentials: 'include',
          body: form,
        })
        if (!res.ok) continue
        const data = (await res.json()) as UploadedMedia
        onUpload(data)
      } catch {
        // silently skip failed uploads
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {uploads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploads.map((m) => (
            <div key={m.mediaId} className="group relative">
              {m.mimeType.startsWith('image/') ? (
                <img src={m.url} alt="" className="h-20 w-20 rounded-md border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted p-1 text-center text-xs text-muted-foreground">
                  {m.mimeType.split('/')[1]}
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(m.mediaId)}
                className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Paperclip size={14} />
        Attach media
      </Button>
    </div>
  )
}
