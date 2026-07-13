import { create } from 'zustand'
import type { School } from '@shared/types'
import i18n from '../i18n'

interface AppState {
  school: School | null
  loading: boolean
  refresh: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  school: null,
  loading: true,

  refresh: async () => {
    const res = await window.api.app.getState()
    const school = res.ok ? res.data?.school ?? null : null
    set({ school, loading: false })
    if (school?.language) {
      i18n.changeLanguage(school.language)
    }
  }
}))
