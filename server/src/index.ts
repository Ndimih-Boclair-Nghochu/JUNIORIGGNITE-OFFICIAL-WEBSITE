import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { load, save, get, nextId, downloadsByDay, resetData, type SchoolRow, type LicenseRow } from './store.js'
import { signToken, verifyToken, verifyPassword } from './auth.js'

load()

const app = express()
// Behind nginx on EC2 — trust the proxy so req.ip is the real client address.
app.set('trust proxy', 1)
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json({ limit: '32kb' }))

const PORT = Number(process.env.PORT ?? 4000)

/**
 * Small in-memory rate limiter. Public write endpoints (download counter,
 * contact form, telemetry) are otherwise trivially abusable to spam the inbox
 * or inflate the public stats. Fine for a single-instance deployment.
 */
function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>()
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    const key = `${req.ip}:${req.path}`
    const entry = hits.get(key)
    if (!entry || now > entry.reset) hits.set(key, { n: 1, reset: now + windowMs })
    else if (++entry.n > max) {
      res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
      return
    }
    // Opportunistic cleanup so the map cannot grow without bound.
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k)
    next()
  }
}

/** Telemetry is machine-to-machine; when TELEMETRY_KEY is set it is required. */
function requireTelemetryKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.TELEMETRY_KEY
  if (!expected) return next()
  if (req.header('x-telemetry-key') !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

/** Trims and length-caps a free-text field before it is persisted. */
const clean = (v: unknown, max: number): string => String(v ?? '').trim().slice(0, max)
const INSTALLER_URL = process.env.INSTALLER_URL ?? '/downloads/JuniorIgnite-Setup-1.1.2.exe'
const APP_VERSION = process.env.APP_VERSION ?? '1.1.2'

/**
 * Headline numbers. Downloads are counted for real by this server; the school /
 * student / user figures are entered by the founder, because schools run fully
 * offline and never report in. Nothing here is invented.
 */
const totals = () => {
  const db = get()
  const s = db.schools
  return {
    downloads: db.downloads,
    schools: db.stats.schools,
    students: db.stats.students,
    activeUsers: db.stats.activeUsers,
    schoolsActive: s.filter((r) => r.status === 'active').length,
    schoolsSuspended: s.filter((r) => r.status === 'suspended').length
  }
}

// ---------------- Public ----------------
app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/stats/public', (_req, res) => {
  const t = totals()
  res.json({ downloads: t.downloads, schools: t.schools, students: t.students, activeUsers: t.activeUsers })
})

/**
 * Latest desktop release. Installed apps poll this to decide whether to show
 * their "Update available" button, which sends the school to the download page.
 */
app.get('/api/version', (_req, res) => {
  res.json({
    version: APP_VERSION,
    downloadUrl: INSTALLER_URL,
    // Where the app should send the user to get the update.
    siteUrl: process.env.SITE_URL ?? ''
  })
})

app.post('/api/download', rateLimit(30, 60_000), (_req, res) => {
  const db = get()
  db.downloads += 1
  db.downloadEvents.push({ ts: new Date().toISOString() })
  save()
  res.json({ url: INSTALLER_URL, version: APP_VERSION })
})

app.post('/api/contact', rateLimit(5, 60_000), (req, res) => {
  const name = clean(req.body?.name, 120)
  const email = clean(req.body?.email, 160)
  const organization = clean(req.body?.organization, 160)
  const message = clean(req.body?.message, 4000)
  if (!name || !email || !message) return res.status(400).json({ error: 'name, email and message are required' })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' })
  const db = get()
  db.contacts.push({ id: nextId(), name, email, organization, message, createdAt: new Date().toISOString() })
  save()
  res.json({ ok: true })
})

// ---------------- Telemetry (from desktop installs) ----------------
app.post('/api/telemetry/register', requireTelemetryKey, rateLimit(60, 60_000), (req, res) => {
  const { key, name, region, subdivision, students, teachers, activeUsers } = req.body ?? {}
  if (!name) return res.status(400).json({ error: 'name is required' })
  const db = get()
  let school = key ? db.schools.find((s) => s.key === key) : undefined
  if (!school) {
    school = {
      id: nextId(),
      key: key ?? cryptoRandom(),
      name,
      region: region ?? null,
      subdivision: subdivision ?? null,
      students: students ?? 0,
      teachers: teachers ?? 0,
      activeUsers: activeUsers ?? 1,
      status: 'active',
      reportCardsAllowed: true,
      licenseExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    db.schools.push(school)
  } else {
    Object.assign(school, { name, region, subdivision, lastSeenAt: new Date().toISOString() })
  }
  save()
  res.json({ key: school.key, reportCardsAllowed: school.reportCardsAllowed, status: school.status })
})

app.post('/api/telemetry/heartbeat', requireTelemetryKey, rateLimit(60, 60_000), (req, res) => {
  const { key, students, teachers, activeUsers } = req.body ?? {}
  const school = get().schools.find((s) => s.key === key)
  if (!school) return res.status(404).json({ error: 'unknown school' })
  if (typeof students === 'number') school.students = students
  if (typeof teachers === 'number') school.teachers = teachers
  if (typeof activeUsers === 'number') school.activeUsers = activeUsers
  school.lastSeenAt = new Date().toISOString()
  save()
  res.json({ reportCardsAllowed: school.reportCardsAllowed, status: school.status })
})

app.get('/api/telemetry/permission/:key', requireTelemetryKey, (req, res) => {
  const school = get().schools.find((s) => s.key === req.params.key)
  if (!school) return res.status(404).json({ error: 'unknown school' })
  res.json({ reportCardsAllowed: school.reportCardsAllowed, status: school.status })
})

// ---------------- Founder ----------------
app.post('/api/founder/login', rateLimit(10, 60_000), (req, res) => {
  const { email, password } = req.body ?? {}
  const f = get().founder
  if (String(email).trim().toLowerCase() !== f.email.toLowerCase() || !verifyPassword(String(password), f.salt, f.hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  res.json({ token: signToken({ sub: 'founder', email: f.email }) })
})

function requireFounder(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

app.get('/api/founder/overview', requireFounder, (_req, res) => {
  const schools = get().schools
  const byRegion = new Map<string, number>()
  for (const s of schools) byRegion.set(s.region ?? '—', (byRegion.get(s.region ?? '—') ?? 0) + 1)
  res.json({
    totals: totals(),
    downloadsByDay: downloadsByDay(),
    schoolsByRegion: [...byRegion.entries()].map(([region, n]) => ({ region, schools: n })),
    recentSchools: [...schools].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  })
})

app.get('/api/founder/schools', requireFounder, (_req, res) => {
  res.json(get().schools)
})

// ---- Founder-entered public statistics ----
app.get('/api/founder/stats', requireFounder, (_req, res) => {
  res.json(get().stats)
})

app.put('/api/founder/stats', requireFounder, (req, res) => {
  const db = get()
  const num = (v: unknown, current: number): number => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : current
  }
  db.stats = {
    schools: num(req.body?.schools, db.stats.schools),
    students: num(req.body?.students, db.stats.students),
    activeUsers: num(req.body?.activeUsers, db.stats.activeUsers),
    updatedAt: new Date().toISOString()
  }
  save()
  res.json(db.stats)
})

// ---- Licence records ----
// The Ed25519 private key is NOT on this server by design. The founder records
// a school's identifiers here, generates the signed code offline with
// tools/license-gen, then pastes it back so there is a record of what was issued.
app.get('/api/founder/licenses', requireFounder, (_req, res) => {
  res.json([...get().licenses].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)))
})

app.post('/api/founder/licenses', requireFounder, (req, res) => {
  const schoolName = clean(req.body?.schoolName, 160)
  const schoolId = clean(req.body?.schoolId, 64)
  const deviceId = clean(req.body?.deviceId, 128)
  if (!schoolName || !schoolId || !deviceId) {
    return res.status(400).json({ error: 'School name, School ID and Device ID are all required.' })
  }
  const db = get()
  const row: LicenseRow = {
    id: nextId(),
    schoolName,
    schoolId,
    deviceId,
    code: null,
    expiresAt: clean(req.body?.expiresAt, 40) || null,
    createdAt: new Date().toISOString(),
    issuedAt: null,
    notes: clean(req.body?.notes, 500) || null
  }
  db.licenses.push(row)
  save()
  res.json(row)
})

app.patch('/api/founder/licenses/:id', requireFounder, (req, res) => {
  const row = get().licenses.find((l) => l.id === Number(req.params.id))
  if (!row) return res.status(404).json({ error: 'Licence record not found' })
  if (req.body?.code !== undefined) {
    const code = clean(req.body.code, 2000)
    row.code = code || null
    row.issuedAt = code ? new Date().toISOString() : null
  }
  if (req.body?.expiresAt !== undefined) row.expiresAt = clean(req.body.expiresAt, 40) || null
  if (req.body?.notes !== undefined) row.notes = clean(req.body.notes, 500) || null
  save()
  res.json(row)
})

app.delete('/api/founder/licenses/:id', requireFounder, (req, res) => {
  const db = get()
  const i = db.licenses.findIndex((l) => l.id === Number(req.params.id))
  if (i === -1) return res.status(404).json({ error: 'Licence record not found' })
  db.licenses.splice(i, 1)
  save()
  res.json({ ok: true })
})

// ---- Contact inbox ----
app.get('/api/founder/contacts', requireFounder, (_req, res) => {
  res.json([...get().contacts].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)))
})

// ---- Danger zone: wipe everything except the founder account ----
app.post('/api/founder/reset', requireFounder, (req, res) => {
  if (req.body?.confirm !== 'RESET') {
    return res.status(400).json({ error: 'Send { "confirm": "RESET" } to confirm.' })
  }
  resetData()
  res.json({ ok: true })
})

app.patch('/api/founder/schools/:id', requireFounder, (req, res) => {
  const school = get().schools.find((s) => s.id === Number(req.params.id))
  if (!school) return res.status(404).json({ error: 'School not found' })
  const patch = req.body ?? {}
  if (typeof patch.reportCardsAllowed === 'boolean') school.reportCardsAllowed = patch.reportCardsAllowed
  if (patch.status === 'active' || patch.status === 'suspended') school.status = patch.status
  save()
  res.json(school as SchoolRow)
})

function cryptoRandom(): string {
  return 'sch_' + Math.random().toString(36).slice(2, 12)
}

app.listen(PORT, () => {
  console.log(`JuniorIgnite API listening on http://localhost:${PORT}`)
})
