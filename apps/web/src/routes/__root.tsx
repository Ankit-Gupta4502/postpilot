import { createRootRoute, HeadContent, Outlet, Scripts} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { OrgProvider } from '../lib/org-context'
import '../globals.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'PostPilot — Social Media Management' },
    ],
    links: [{ rel: 'icon', href: '/favicon.ico' }],
  }),
  component: RootComponent,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  return (
    <RootDocument>
      <OrgProvider>
        <Outlet />
      </OrgProvider>
    </RootDocument>
  )
}
