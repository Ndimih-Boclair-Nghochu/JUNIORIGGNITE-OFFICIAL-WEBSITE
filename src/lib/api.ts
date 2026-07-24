import { API_BASE, SITE } from './config'
import { mockOverview, mockPublicStats, makeSchools } from './mock'
import type {
  ContactPayload,
  FounderOverview,
  PublicStats,
  SchoolRow,
  PublicStatsInput,
  TeamMember,
  ContactMsg,
  SiteSettings
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
  /**
   * Founder sign-in. There is deliberately NO offline/demo fallback — the only
   * way in is a real credential verified by the server, so a lost connection
   * fails closed rather than handing out a console session.
   */
  founderLogin: async (email: string, password: string): Promise<{ token: string }> => {
    const r = await req<{ token: string }>('/api/founder/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    localStorage.setItem(FOUNDER_TOKEN_KEY, r.token)
    usingMock = false
    return r
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

  /** Re-issues a school's licence (extends expiry + new signed code). */
  renewLicense: (id: number): Promise<SchoolRow> =>
    req<SchoolRow>(`/api/founder/schools/${id}/license`, { method: 'POST' }),

  // ---- Founder-entered public statistics ----
  founderStats: (): Promise<PublicStatsInput> => req<PublicStatsInput>('/api/founder/stats'),

  saveFounderStats: (stats: { schools: number; students: number; activeUsers: number }): Promise<PublicStatsInput> =>
    req<PublicStatsInput>('/api/founder/stats', { method: 'PUT', body: JSON.stringify(stats) }),

  contacts: (): Promise<ContactMsg[]> => req<ContactMsg[]>('/api/founder/contacts'),

  // ---- Team (public read of published, founder full CRUD) ----
  team: (): Promise<TeamMember[]> => req<TeamMember[]>('/api/team'),
  founderTeam: (): Promise<TeamMember[]> => req<TeamMember[]>('/api/founder/team'),
  saveTeamMember: (member: Partial<TeamMember>): Promise<TeamMember> =>
    member.id
      ? req<TeamMember>(`/api/founder/team/${member.id}`, { method: 'PATCH', body: JSON.stringify(member) })
      : req<TeamMember>('/api/founder/team', { method: 'POST', body: JSON.stringify(member) }),
  deleteTeamMember: (id: number): Promise<{ ok: true }> =>
    req<{ ok: true }>(`/api/founder/team/${id}`, { method: 'DELETE' }),

  // ---- Site settings (public read, founder write) ----
  siteSettings: (): Promise<SiteSettings> => req<SiteSettings>('/api/site-settings'),

  saveSiteSettings: (patch: Partial<SiteSettings>): Promise<SiteSettings> =>
    req<SiteSettings>('/api/founder/site-settings', { method: 'PUT', body: JSON.stringify(patch) })
}

/** Extracts a YouTube video id from any common URL form, or '' if none. */
export function youtubeEmbedId(input: string): string {
  const s = (input ?? '').trim()
  if (!s) return ''
  // Already a bare 11-char id
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/ID
    /\/live\/([A-Za-z0-9_-]{11})/ // /live/ID
  ]
  for (const p of patterns) {
    const m = s.match(p)
    if (m) return m[1]
  }
  return ''
}
