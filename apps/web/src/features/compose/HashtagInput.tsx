import { useState, useRef } from 'react'
import { X, Hash } from 'lucide-react'
import { cn } from '@postpilot/ui'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  platform?: string
}

const PLATFORM_TAG_LIMITS: Record<string, number> = {
  instagram: 30,
  facebook: 30,
  linkedin: 3,
  x: 0,       // hashtags count against char limit on X — no separate cap
  youtube: 15,
}

function sanitize(raw: string): string {
  return raw.replace(/^#+/, '').replace(/[^a-zA-Z0-9_À-ɏЀ-ӿ]/g, '').toLowerCase()
}

export function HashtagInput({ tags, onChange, platform }: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const limit = platform ? (PLATFORM_TAG_LIMITS[platform] ?? null) : null
  const overLimit = limit !== null && limit > 0 && tags.length >= limit

  function addTag(raw: string) {
    const tag = sanitize(raw)
    if (!tag || tags.includes(tag) || overLimit) return
    onChange([...tags, tag])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex min-h-12 flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-background/80 px-3.5 py-3 text-sm shadow-sm focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-ring/20',
          overLimit && 'border-amber-400/60 focus-within:border-amber-400/60'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Hash size={14} />
        </span>
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="hover:text-destructive"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\s/g, ''))}
          onKeyDown={handleKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? 'Type a hashtag and press Enter…' : ''}
          disabled={overLimit}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press <kbd className="rounded border px-1 font-mono text-[10px]">Enter</kbd> or <kbd className="rounded border px-1 font-mono text-[10px]">Space</kbd> to add
        </p>
        {limit !== null && limit > 0 && (
          <p className={cn('text-xs', overLimit ? 'text-amber-500' : 'text-muted-foreground')}>
            {tags.length} / {limit} hashtags
          </p>
        )}
      </div>
    </div>
  )
}
