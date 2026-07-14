export interface PublicStats {
  downloads: number
  schools: number
  students: number
  activeUsers: number
}

export interface SchoolRow {
  id: number
  name: string
  region: string | null
  subdivision: string | null
  students: number
  teachers: number
  activeUsers: number
  status: 'active' | 'suspended'
  reportCardsAllowed: boolean
  licenseExpiresAt: string | null
  lastSeenAt: string | null
  createdAt: string
}

export interface FounderOverview {
  totals: PublicStats & { schoolsActive: number; schoolsSuspended: number }
  downloadsByDay: { date: string; downloads: number }[]
  schoolsByRegion: { region: string; schools: number }[]
  recentSchools: SchoolRow[]
}

export interface ContactPayload {
  name: string
  email: string
  organization?: string
  message: string
}
