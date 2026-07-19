import { API_BASE, SITE } from './config'
import { mockOverview, mockPublicStats, makeSchools } from './mock'
import type {
  ContactPayload,
  FounderOverview,
  PublicStats,
  SchoolRow,
  PublicStatsInput,
  LicenseRow,
  ContactMsg
} from './types'

const FOUNDER_TOKEN_KEY = 'ji_founder_token'

async function req<T>(pathname: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(FOUNDER_TOKEN_KEY)
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Request failed (${res.status})`)
  return res.json() as Promise<T>
}

/**
 * The site works with OR without the backend. Every call attempts the real API
 * first and falls back to seeded demo data so the marketing site and founder
 * dashboard are always explorable. `usingMock` lets the UI show a small banner.
 */
export let usingMock = false

async function withFallback<T>(live: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    const data = await live()
    usingMock = false
    return data
  } catch {
    usingMock = true
    return fallback()
  }
}

export const api = {
  // ---- Public ----
  publicStats: (): Promise<PublicStats> =>
    withFallback(() => req<PublicStats>('/api/stats/public'), mockPublicStats),

  /** Records the download and returns the installer URL. */
  recordDownload: async (): Promise<{ url: string; version: string }> => {
    try {
      return await req('/api/download', { method: 'POST' })
    } catch {
      usingMock = true
      // No backend configured — download the installer served statically from
      // /downloads so the site still delivers the app on its own.
      return { url: SITE.installerPath, version: SITE.version }
    }
  },

  contact: async (payload: ContactPayload): Promise<{ ok: true }> => {
    try {
      return await req('/api/contact', { method: 'POST', body: JSON.stringify(payload) })
    } catch {
      usingMock = true
      return { ok: true } // optimistic in demo mode
    }
  },

  // ---- Founder ----
  founderLogin: async (email: string, password: string): Promise<{ token: string }> => {
    try {
      const r = await req<{ token: string }>('/api/founder/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      localStorage.setItem(FOUNDER_TOKEN_KEY, r.token)
      usingMock = false
      return r
    } catch (err) {
      // Demo credentials work offline so the dashboard can be reviewed.
      if (email.trim().toLowerCase() === 'founder@juniorignite.app' && password === 'founder123') {
        localStorage.setItem(FOUNDER_TOKEN_KEY, 'demo-token')
        usingMock = true
        return { token: 'demo-token' }
      }
      throw err instanceof Error ? err : new Error('Login failed')
    }
  },

  isFounderAuthed: (): boolean => !!localStorage.getItem(FOUNDER_TOKEN_KEY),
  founderLogout: (): void => localStorage.removeItem(FOUNDER_TOKEN_KEY),

  founderOverview: (): Promise<FounderOverview> =>
    withFallback(() => req<FounderOverview>('/api/founder/overview'), mockOverview),

  founderSchools: (): Promise<SchoolRow[]> =>
    withFallback(() => req<SchoolRow[]>('/api/founder/schools'), makeSchools),

  updateSchool: async (
    id: number,
    patch: Partial<Pick<SchoolRow, 'reportCardsAllowed' | 'status'>>
  ): Promise<SchoolRow> => {
    try {
      return await req<SchoolRow>(`/api/founder/schools/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      })
    } catch {
      usingMock = true
      // Reflect the change locally in demo mode.
      const row = makeSchools().find((s) => s.id === id)!
      return { ...row, ...patch }
    }
  },

  // ---- Founder-entered public statistics ----
  founderStats: (): Promise<PublicStatsInput> => req<PublicStatsInput>('/api/founder/stats'),

  saveFounderStats: (stats: { schools: number; students: number; activeUsers: number }): Promise<PublicStatsInput> =>
    req<PublicStatsInput>('/api/founder/stats', { method: 'PUT', body: JSON.stringify(stats) }),

  // ---- Licence records (signing key stays offline) ----
  licenses: (): Promise<LicenseRow[]> => req<LicenseRow[]>('/api/founder/licenses'),

  createLicense: (payload: {
    schoolName: string
    schoolId: string
    deviceId: string
    expiresAt?: string
    notes?: string
  }): Promise<LicenseRow> => req<LicenseRow>('/api/founder/licenses', { method: 'POST', body: JSON.stringify(payload) }),

  updateLicense: (id: number, patch: { code?: string; expiresAt?: string; notes?: string }): Promise<LicenseRow> =>
    req<LicenseRow>(`/api/founder/licenses/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  deleteLicense: (id: number): Promise<{ ok: true }> =>
    req<{ ok: true }>(`/api/founder/licenses/${id}`, { method: 'DELETE' }),

  contacts: (): Promise<ContactMsg[]> => req<ContactMsg[]>('/api/founder/contacts')
}
