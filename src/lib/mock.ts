import type { FounderOverview, PublicStats, SchoolRow } from './types'

// Fallbacks used only when the backend is unreachable. They are deliberately
// EMPTY — the site must never show invented schools, pupils or download counts.
// Real figures come from the API: downloads are counted automatically, and the
// headline numbers are entered by the founder in the console.

export function makeSchools(): SchoolRow[] {
  return []
}

export function mockPublicStats(): PublicStats {
  return { downloads: 0, schools: 0, students: 0, activeUsers: 0 }
}

export function mockOverview(): FounderOverview {
  const downloadsByDay = Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
    downloads: 0
  }))
  return {
    totals: { downloads: 0, schools: 0, students: 0, activeUsers: 0, schoolsActive: 0, schoolsSuspended: 0 },
    downloadsByDay,
    schoolsByRegion: [],
    recentSchools: []
  }
}
