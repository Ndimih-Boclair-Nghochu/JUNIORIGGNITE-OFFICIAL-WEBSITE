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
  licenseCode: string | null
  licenseExpiresAt: string | null
  licenseIssuedAt: string | null
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

/**
 * Headline figures shown publicly. Entered by the founder — schools run offline
 * and never report in, so the server cannot count them. Downloads are separate:
 * those are counted automatically by the site.
 */
export interface PublicStatsInput {
  schools: number
  students: number
  activeUsers: number
  updatedAt: string | null
}

/** A team member shown on the public About page once published. */
export interface TeamMember {
  id: number
  name: string
  role: string
  bio: string
  photo: string
  order: number
  published: boolean
  createdAt: string
}

export interface ContactMsg {
  id: number
  name: string
  email: string
  organization?: string
  message: string
  createdAt: string
}

/** Contact details + outbound links, editable by the founder. */
export interface SiteSettings {
  email: string
  phone: string
  address: string
  hours: string
  eligniteUrl: string
  youtube: string
  facebook: string
  videoUrl: string
  updatedAt: string | null
}
