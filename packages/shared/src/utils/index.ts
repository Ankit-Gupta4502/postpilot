export function generateIdempotencyKey(postId: string, socialAccountId: string): string {
  return `${postId}:${socialAccountId}`
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

export function hashToken(token: string): Promise<string> {
  return import('node:crypto').then(({ createHash }) =>
    createHash('sha256').update(token).digest('hex')
  )
}

export function generateSecureToken(bytes = 32): Promise<string> {
  return import('node:crypto').then(({ randomBytes }) =>
    randomBytes(bytes).toString('base64url')
  )
}
