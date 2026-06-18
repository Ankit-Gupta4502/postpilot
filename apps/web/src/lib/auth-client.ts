import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : process.env['VITE_API_URL'] ?? 'http://localhost:8080',
})

export const { signIn, signOut, useSession } = authClient
