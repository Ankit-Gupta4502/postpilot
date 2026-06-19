import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db, schema } from '@postpilot/db'

/**
 * Derives the apex domain from a URL for cross-subdomain cookie sharing.
 * e.g. "https://app.postpilot.com" → ".postpilot.com"
 * Returns undefined for localhost or bare IPs so dev is unaffected.
 */
function apexDomain(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const host = new URL(url).hostname
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined
    const parts = host.split('.')
    return parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : undefined
  } catch {
    return undefined
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: process.env['BETTER_AUTH_SECRET']!,
  baseURL: process.env['BETTER_AUTH_URL']!,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']
      ? {
          google: {
            clientId: process.env['GOOGLE_CLIENT_ID'],
            clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
          },
        }
      : {}),
  },
  session: {
    cookieCache: { enabled: true, maxAge: 300 },
  },
  advanced: {
    // Automatically scope the session cookie to the apex domain so it is shared
    // across subdomains (e.g. app.postpilot.com ↔ api.postpilot.com).
    // Skipped for localhost and bare IPs so local dev is unaffected.
    ...(apexDomain(process.env['APP_BASE_URL'])
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: apexDomain(process.env['APP_BASE_URL']),
          },
        }
      : {}),
  },
})

export type Auth = typeof auth
