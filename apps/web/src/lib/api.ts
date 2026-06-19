import axios, { type AxiosRequestConfig } from 'axios'

function resolveApiBase(): string {
  const url = import.meta.env['VITE_API_URL']
  if (!url) {
    console.warn('[api] VITE_API_URL is not set — falling back to http://localhost:8080')
  }
  return url ?? 'http://localhost:8080'
}

const API_BASE = resolveApiBase()

interface ApiEnvelope<T> {
  status: 'success' | 'error'
  message: string
  data: T
}

export async function apiFetch<T>(path: string, options?: AxiosRequestConfig & { orgId?: string }): Promise<T> {
  const { orgId, ...axiosOptions } = options ?? {}
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(axiosOptions.headers as Record<string, string>),
  }
  if (orgId) headers['X-Org-Id'] = orgId

  const res = await axios<ApiEnvelope<T>>(`${API_BASE}${path}`, {
    ...axiosOptions,
    headers,
    withCredentials: true,
  })

  // 204 No Content has no body
  if (res.status === 204) return undefined as T

  return res.data.data
}
