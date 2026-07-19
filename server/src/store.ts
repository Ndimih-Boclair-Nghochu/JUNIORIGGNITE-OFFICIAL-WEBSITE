import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { hashPassword } from './auth.js'

export interface SchoolRow {
  id: number
  key: string // opaque id used by desktop installs to identify themselves
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

export interface ContactMsg {
  id: number
  name: string
  email: string
  organization?: string
  message: string
  createdAt: string
}

/**
 * Headline figures shown on the public site. These are entered by the founder —
 * schools run offline, so the server cannot count them itself. Downloads are the
 * exception: those are counted automatically from the site's download button.
 */
export interface PublicStatsRow {
  schools: number
  students: number
  activeUsers: number
  updatedAt: string | null
}

/**
 * A licence issued to one school. The Ed25519 private key never touches this
 * server — the founder records the school's School ID + Device ID here, runs
 * tools/license-gen offline, and pastes the signed code back for record-keeping.
 */
export interface LicenseRow {
  id: number
  schoolName: string
  schoolId: string
  deviceId: string
  /** The signed activation code, once generated offline. Null until issued. */
  code: string | null
  expiresAt: string | null
  createdAt: string
  issuedAt: string | null
  notes: string | null
}

/**
 * Contact details and outbound links shown across the public site. Editable by
 * the founder so the site can be updated without a redeploy.
 */
export interface SiteSettings {
  email: string
  phone: string
  address: string
  hours: string
  /** "POWERED BY ELIGNITE" in the footer links here. */
  eligniteUrl: string
  youtube: string
  facebook: string
  updatedAt: string | null
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  email: 'juniorignitecmr@gmail.com',
  phone: '+237 678 897 272',
  address: 'Bamenda, North West Region, Cameroon',
  hours: 'Mon – Sat: 8:00 AM – 6:00 PM',
  eligniteUrl: 'https://elignite.com',
  youtube: '',
  facebook: '',
  updatedAt: null
}

interface DB {
  downloads: number
  downloadEvents: { ts: string }[]
  schools: SchoolRow[]
  contacts: ContactMsg[]
  licenses: LicenseRow[]
  stats: PublicStatsRow
  site: SiteSettings
  founder: { email: string; salt: string; hash: string }
  seq: number
}

// Override with DATA_DIR on the server so the database lives outside the deploy
// folder (e.g. /var/lib/juniorignite) and survives redeploys.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

let db: DB

function seed(): DB {
  const email = process.env.FOUNDER_EMAIL ?? 'founder@juniorignite.app'
  const password = process.env.FOUNDER_PASSWORD ?? 'founder123'
  // The founder account is created once, on first boot. Creating it with the
  // documented default password on a public server is an open door.
  if (process.env.NODE_ENV === 'production' && password === 'founder123') {
    console.error(
      '\nFATAL: FOUNDER_PASSWORD is still the default "founder123".\n' +
        'Set a strong FOUNDER_PASSWORD before first start (it is hashed on seed).\n'
    )
    process.exit(1)
  }
  const { salt, hash } = hashPassword(password)

  // A brand-new installation starts completely empty. Nothing is invented:
  // downloads are counted for real from the site's download button, and the
  // headline figures are entered by the founder from the console.
  return {
    downloads: 0,
    downloadEvents: [],
    schools: [],
    contacts: [],
    licenses: [],
    stats: { schools: 0, students: 0, activeUsers: 0, updatedAt: null },
    site: { ...DEFAULT_SITE_SETTINGS },
    founder: { email, salt, hash },
    seq: 1
  }
}

export function load(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    // Backfill fields added after this database was first written, so an
    // existing deployment keeps working without manual intervention.
    db.licenses ??= []
    db.stats ??= { schools: 0, students: 0, activeUsers: 0, updatedAt: null }
    db.site = { ...DEFAULT_SITE_SETTINGS, ...(db.site ?? {}) }
    db.contacts ??= []
    db.schools ??= []
    db.downloadEvents ??= []
  } else {
    db = seed()
    save()
  }
}

/**
 * Wipes every record but keeps the founder account. Used by the console's
 * "reset demo data" action so a site can be taken from demo to live cleanly.
 */
export function resetData(): void {
  db.downloads = 0
  db.downloadEvents = []
  db.schools = []
  db.contacts = []
  db.licenses = []
  db.stats = { schools: 0, students: 0, activeUsers: 0, updatedAt: null }
  db.seq = 1  // site settings are configuration, not data — deliberately kept
  save()
}

export function save(): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export function get(): DB {
  return db
}

export function nextId(): number {
  db.seq += 1
  return db.seq
}

/** Aggregates downloads per day for the last 14 days. */
export function downloadsByDay(): { date: string; downloads: number }[] {
  const byDay = new Map<string, number>()
  for (let d = 13; d >= 0; d--) {
    byDay.set(new Date(Date.now() - d * 86400000).toISOString().slice(0, 10), 0)
  }
  for (const e of db.downloadEvents) {
    const day = e.ts.slice(0, 10)
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }
  return [...byDay.entries()].map(([date, downloads]) => ({ date, downloads }))
}
