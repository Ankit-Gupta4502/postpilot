const API_BASE = typeof window !== 'undefined'
  ? ''
  : (process.env['VITE_API_URL'] ?? 'http://localhost:8080')

export async function apiFetch<T>(path: string, options?: RequestInit & { orgId?: string }): Promise<T> {
  const { orgId, ...fetchOptions } = options ?? {}
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (orgId) headers['X-Org-Id'] = orgId

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers, credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw Object.assign(new Error(err.message), { status: res.status, data: err })
  }
  return res.json() as Promise<T>
}
