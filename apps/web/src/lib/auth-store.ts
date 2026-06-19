import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  /** true once the first session check has resolved */
  hydrated: boolean
  /** whether a valid session exists */
  isAuthed: boolean
  userId: string | null
  userName: string | null
  userEmail: string | null
  setSession: (user: { id: string; name: string; email: string } | null) => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hydrated: false,
      isAuthed: false,
      userId: null,
      userName: null,
      userEmail: null,
      setSession(user) {
        set(
          user
            ? { isAuthed: true, userId: user.id, userName: user.name, userEmail: user.email }
            : { isAuthed: false, userId: null, userName: null, userEmail: null }
        )
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'postpilot-auth',
      partialize: (s) => ({
        isAuthed: s.isAuthed,
        userId: s.userId,
        userName: s.userName,
        userEmail: s.userEmail,
      }),
    }
  )
)
