import { create } from 'zustand'
import type { Session } from '@shared/types'

interface AuthState {
  session: Session
  loading: boolean
  refresh: () => Promise<void>
  adminLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  unlockClass: (classId: number, code: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,

  refresh: async () => {
    const res = await window.api.auth.currentSession()
    set({ session: res.ok ? res.data ?? null : null, loading: false })
  },

  adminLogin: async (username, password) => {
    const res = await window.api.auth.adminLogin({ username, password })
    if (res.ok) set({ session: res.data ?? null })
    return { ok: res.ok, error: res.error }
  },

  unlockClass: async (classId, code) => {
    const res = await window.api.auth.unlockClass({ classId, code })
    if (res.ok) set({ session: res.data ?? null })
    return { ok: res.ok, error: res.error }
  },

  logout: async () => {
    await window.api.auth.logout()
    set({ session: null })
  }
}))
