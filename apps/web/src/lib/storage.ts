/**
 * Typed localStorage registry.
 *
 * All keys live here — one place to audit what the app stores.
 * Access via `storage.get / set / remove` so magic strings never
 * appear elsewhere and TypeScript enforces only known keys.
 *
 * SSR-safe: every method no-ops or returns null when window is absent.
 */

const KEYS = {
  activeOrgId:       'pp:active-org-id',
  activeWorkspaceId: 'pp:active-workspace-id',
} as const

type StorageKey = keyof typeof KEYS

const ok = () => typeof window !== 'undefined'

export const storage = {
  get(key: StorageKey): string | null {
    return ok() ? localStorage.getItem(KEYS[key]) : null
  },
  set(key: StorageKey, value: string): void {
    if (ok()) localStorage.setItem(KEYS[key], value)
  },
  remove(key: StorageKey): void {
    if (ok()) localStorage.removeItem(KEYS[key])
  },
} as const
