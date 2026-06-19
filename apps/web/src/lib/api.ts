import axios, { type AxiosRequestConfig } from 'axios'

const API_BASE = typeof window !== 'undefined'
  ? ''
  : (process.env['VITE_API_URL'] ?? 'http://localhost:8080')

export async function apiFetch<T>(path: string, options?: AxiosRequestConfig & { orgId?: string }): Promise<T> {
  const { orgId, ...axiosOptions } = options ?? {}
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(axiosOptions.headers as Record<string, string>),
  }
  if (orgId) headers['X-Org-Id'] = orgId

  const res = await axios<T>(`${API_BASE}${path}`, {
    ...axiosOptions,
    headers,
    withCredentials: true,
  })

  return res.data
}
