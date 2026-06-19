import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  ShieldCheck,
  BarChart3,
  CalendarRange,
} from 'lucide-react'
import { XIcon } from './XIcon'

export const PLATFORM_ICONS = [
  { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-50', label: 'Instagram' },
  { icon: Linkedin, color: 'text-sky-600', bg: 'bg-sky-50', label: 'LinkedIn' },
  { icon: Youtube, color: 'text-red-500', bg: 'bg-red-50', label: 'YouTube' },
  { icon: XIcon, color: 'text-slate-800', bg: 'bg-slate-100', label: 'X' },
  { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Facebook' },
]

export const platformStats = [
  { label: 'Instagram', value: '12 scheduled', icon: Instagram, color: 'text-pink-500' },
  { label: 'LinkedIn', value: '8 queued', icon: Linkedin, color: 'text-sky-600' },
  { label: 'YouTube', value: '3 drafts', icon: Youtube, color: 'text-red-500' },
  { label: 'X', value: '15 ready', icon: XIcon, color: 'text-slate-800' },
]

export const features = [
  {
    title: 'One calendar for every channel',
    description:
      'Plan Instagram, LinkedIn, X, YouTube, and Facebook content from a single queue without juggling tabs.',
    icon: CalendarRange,
  },
  {
    title: 'Clear approvals for teams and clients',
    description:
      'Draft, review, approve, and publish with a workflow that matches how agencies and internal teams already work.',
    icon: ShieldCheck,
  },
  {
    title: 'Analytics you can act on',
    description:
      'See what shipped, what performed, and where the next publishing opportunity is instead of staring at vanity metrics.',
    icon: BarChart3,
  },
]

export const productPoints = [
  'Unified post composer with platform selection',
  'Scheduled publishing and draft management',
  'Workspace access for teams and agencies',
  'Approval flow before anything goes live',
]

export const metrics = [
  { value: '50K+', label: 'active creators' },
  { value: '2M+', label: 'scheduled posts' },
  { value: '97%', label: 'on-time delivery' },
]

export const floatingIcons = [
  {
    icon: Instagram,
    className: 'left-[4%] top-14 hidden sm:flex',
    delay: '0s',
    size: 'h-12 w-12',
    color: 'text-pink-400/50',
  },
  {
    icon: Linkedin,
    className: 'right-[10%] top-24 hidden lg:flex',
    delay: '1.1s',
    size: 'h-10 w-10',
    color: 'text-sky-500/50',
  },
  {
    icon: Youtube,
    className: 'left-[38%] top-6 hidden md:flex',
    delay: '0.5s',
    size: 'h-9 w-9',
    color: 'text-red-400/50',
  },
  {
    icon: XIcon,
    className: 'right-[5%] bottom-18 hidden sm:flex',
    delay: '1.7s',
    size: 'h-14 w-14',
    color: 'text-slate-600/45',
  },
  {
    icon: Facebook,
    className: 'left-[12%] bottom-10 hidden lg:flex',
    delay: '0.8s',
    size: 'h-10 w-10',
    color: 'text-blue-500/45',
  },
]
