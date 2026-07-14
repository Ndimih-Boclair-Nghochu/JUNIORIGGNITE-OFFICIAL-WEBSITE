import type { FounderOverview, PublicStats, SchoolRow } from './types'

// Local demo data so the site is fully explorable without the backend running.
// The real numbers come from the backend (in the desktop app repo) once it is up.

const REGIONS = ['North West', 'South West', 'Centre', 'Littoral', 'West', 'Far North']
const NAMES = [
  'Sunrise Bilingual Nursery & Primary',
  'St. Andrews Primary School',
  'Little Scholars Academy',
  'Grace Bilingual College',
  'Foumban Community Primary',
  'Buea Mountain Nursery',
  'Douala Rise Academy',
  'Bafoussam Star Primary',
  'Kumba Unity School',
  'Bright Future Nursery',
  'Green Valley Primary',
  'Cornerstone Bilingual School'
]

let seq = 100
export function makeSchools(): SchoolRow[] {
  const now = Date.now()
  return NAMES.map((name, i) => {
    const students = 60 + ((i * 47) % 380)
    const teachers = 4 + ((i * 3) % 18)
    return {
      id: (seq += 1),
      name,
      region: REGIONS[i % REGIONS.length],
      subdivision: null,
      students,
      teachers,
      activeUsers: 1 + (teachers % 6),
      status: i % 7 === 0 ? 'suspended' : 'active',
      reportCardsAllowed: i % 3 !== 0,
      licenseExpiresAt: new Date(now + (30 + i * 12) * 86400000).toISOString(),
      lastSeenAt: new Date(now - (i % 5) * 86400000).toISOString(),
      createdAt: new Date(now - (i * 9 + 5) * 86400000).toISOString()
    }
  })
}

export function mockPublicStats(): PublicStats {
  const schools = makeSchools()
  return {
    downloads: 1487,
    schools: schools.length,
    students: schools.reduce((s, r) => s + r.students, 0),
    activeUsers: schools.reduce((s, r) => s + r.activeUsers, 0)
  }
}

export function mockOverview(): FounderOverview {
  const schools = makeSchools()
  const students = schools.reduce((s, r) => s + r.students, 0)
  const activeUsers = schools.reduce((s, r) => s + r.activeUsers, 0)
  const downloadsByDay = Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
    downloads: 40 + Math.round(60 * Math.abs(Math.sin(i / 2))) + (i % 3) * 8
  }))
  const byRegion = new Map<string, number>()
  for (const s of schools) byRegion.set(s.region ?? '—', (byRegion.get(s.region ?? '—') ?? 0) + 1)
  return {
    totals: {
      downloads: 1487,
      schools: schools.length,
      students,
      activeUsers,
      schoolsActive: schools.filter((s) => s.status === 'active').length,
      schoolsSuspended: schools.filter((s) => s.status === 'suspended').length
    },
    downloadsByDay,
    schoolsByRegion: [...byRegion.entries()].map(([region, n]) => ({ region, schools: n })),
    recentSchools: schools
  }
}
