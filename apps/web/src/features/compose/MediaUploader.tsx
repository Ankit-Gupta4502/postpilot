import { useRef, useState } from 'react'
import { Paperclip, UploadCloud, Video, X } from 'lucide-react'
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
  const [isDragging, setIsDragging] = useState(false)

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
    <div
      className={[
        'space-y-3 rounded-2xl border border-dashed p-3.5 transition-all sm:p-4',
        isDragging
          ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/10'
          : 'border-border/70 bg-gradient-to-br from-background via-background to-muted/30',
      ].join(' ')}
      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        void handleFiles(e.dataTransfer.files)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Visual assets</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start with the image or video. The copy follows the creative instead of the other way around.
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
          <UploadCloud size={12} />
          Drag and drop
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {uploads.map((m) => (
            <div key={m.mediaId} className="group relative overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
              {m.mimeType.startsWith('image/') ? (
                <img src={m.url} alt="" className="h-28 w-full object-cover sm:h-32" />
              ) : (
                <div className="flex h-28 w-full flex-col items-center justify-center bg-gradient-to-br from-muted/80 to-muted p-2.5 text-center sm:h-32">
                  <Video size={16} className="mb-1.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">{m.mimeType.split('/')[1]?.toUpperCase() ?? 'VIDEO'}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Ready for publish</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2.5 py-1.5 text-[10px] text-white">
                <span className="truncate">Media {uploads.findIndex((item) => item.mediaId === m.mediaId) + 1}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 uppercase tracking-wide">
                  {m.mimeType.split('/')[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(m.mediaId)}
                className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition group-hover:flex"
              >
                <X size={11} />
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
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Paperclip size={13} />
          Add media
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Multiple files are supported. Image and video uploads are processed immediately.
        </p>
      </div>
    </div>
  )
}
