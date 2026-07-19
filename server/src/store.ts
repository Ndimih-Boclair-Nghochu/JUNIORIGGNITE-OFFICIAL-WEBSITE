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

interface DB {
  downloads: number
  downloadEvents: { ts: string }[]
  schools: SchoolRow[]
  contacts: ContactMsg[]
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
  const now = Date.now()
  const schools: SchoolRow[] = NAMES.map((name, i) => ({
    id: 101 + i,
    key: crypto.randomUUID(),
    name,
    region: REGIONS[i % REGIONS.length],
    subdivision: null,
    students: 60 + ((i * 47) % 380),
    teachers: 4 + ((i * 3) % 18),
    activeUsers: 1 + ((4 + ((i * 3) % 18)) % 6),
    status: i % 7 === 0 ? 'suspended' : 'active',
    reportCardsAllowed: i % 3 !== 0,
    licenseExpiresAt: new Date(now + (30 + i * 12) * 86400000).toISOString(),
    lastSeenAt: new Date(now - (i % 5) * 86400000).toISOString(),
    createdAt: new Date(now - (i * 9 + 5) * 86400000).toISOString()
  }))

  const downloadEvents: { ts: string }[] = []
  for (let d = 13; d >= 0; d--) {
    const count = 40 + Math.round(60 * Math.abs(Math.sin(d / 2))) + (d % 3) * 8
    for (let j = 0; j < count; j++) downloadEvents.push({ ts: new Date(now - d * 86400000).toISOString() })
  }

  return {
    downloads: downloadEvents.length + 100,
    downloadEvents,
    schools,
    contacts: [],
    founder: { email, salt, hash },
    seq: 200
  }
}

export function load(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } else {
    db = seed()
    save()
  }
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
