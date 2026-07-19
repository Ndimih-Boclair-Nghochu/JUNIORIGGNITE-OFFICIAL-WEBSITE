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

/**
 * A record of a licence issued to one school. The signing key stays offline, so
 * `code` is generated with tools/license-gen and pasted back here for the record.
 */
export interface LicenseRow {
  id: number
  schoolName: string
  schoolId: string
  deviceId: string
  code: string | null
  expiresAt: string | null
  createdAt: string
  issuedAt: string | null
  notes: string | null
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
  updatedAt: string | null
}
