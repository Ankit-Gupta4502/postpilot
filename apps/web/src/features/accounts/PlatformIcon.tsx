import { Instagram, Facebook, Linkedin, Twitter, Youtube, type LucideIcon } from 'lucide-react'

const COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400',
  facebook: 'bg-blue-600',
  linkedin: 'bg-sky-700',
  x: 'bg-neutral-950',
  youtube: 'bg-red-600',
}

const ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  x: Twitter,
  youtube: Youtube,
}

interface PlatformIconProps {
  platform: string
  size?: 'sm' | 'md' | 'lg'
}

export function PlatformIcon({ platform, size = 'md' }: PlatformIconProps) {
  const bg = COLORS[platform] ?? 'bg-muted'
  const dim = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 26 : 18
  const radius = size === 'lg' ? 'rounded-2xl' : 'rounded-xl'
  const Icon = ICONS[platform]

  return (
    <span className={`${dim} ${bg} ${radius} inline-flex shrink-0 items-center justify-center`}>
      {Icon ? (
        <Icon size={iconSize} color="white" strokeWidth={1.5} />
      ) : (
        <span className="text-xs font-bold text-white">
          {platform.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  )
}
