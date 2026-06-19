import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.07),_transparent_24%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--background))_60%,_rgba(248,250,252,0.65))]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
