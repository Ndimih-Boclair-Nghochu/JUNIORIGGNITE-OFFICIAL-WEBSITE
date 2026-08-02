import crypto from 'node:crypto'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { load, save, get, nextId, downloadsByDay, resetData, type SchoolRow, type TeamMember } from './store.js'
import { signToken, verifyToken, verifyPassword, signLicense } from './auth.js'

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
/** How long an automatically-issued school licence lasts. */
const LICENSE_YEARS = 1

/** Issues (or renews) a school's licence: sets the expiry and signs a fresh code. */
function issueLicense(school: SchoolRow): void {
  const expires = new Date(Date.now() + LICENSE_YEARS * 365 * 86400000).toISOString()
  school.licenseExpiresAt = expires
  school.licenseCode = signLicense(school.key, expires)
  school.licenseIssuedAt = new Date().toISOString()
}

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

/** Contact details + links rendered across the public site, editable by the founder. */
app.get('/api/site-settings', (_req, res) => {
  res.json(get().site)
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
      licenseCode: null,
      licenseExpiresAt: null,
      licenseIssuedAt: null,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    // A licence is issued automatically the instant a school registers — no
    // manual step. The founder can re-issue later from the console.
    issueLicense(school)
    db.schools.push(school)
  } else {
    Object.assign(school, { name, region, subdivision, lastSeenAt: new Date().toISOString() })
  }
  save()
  res.json({
    key: school.key,
    reportCardsAllowed: school.reportCardsAllowed,
    status: school.status,
    licenseCode: school.licenseCode,
    licenseExpiresAt: school.licenseExpiresAt
  })
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

// ---- Site settings (contact details + ELIGNITE link) ----
app.get('/api/founder/site-settings', requireFounder, (_req, res) => {
  res.json(get().site)
})

app.put('/api/founder/site-settings', requireFounder, (req, res) => {
  const db = get()
  const b = req.body ?? {}
  const keep = (v: unknown, current: string, max = 200): string => {
    const s = clean(v, max)
    return v === undefined ? current : s
  }
  db.site = {
    email: keep(b.email, db.site.email, 160),
    phone: keep(b.phone, db.site.phone, 60),
    address: keep(b.address, db.site.address, 240),
    hours: keep(b.hours, db.site.hours, 120),
    eligniteUrl: keep(b.eligniteUrl, db.site.eligniteUrl, 300),
    youtube: keep(b.youtube, db.site.youtube, 300),
    facebook: keep(b.facebook, db.site.facebook, 300),
    videoUrl: keep(b.videoUrl, db.site.videoUrl, 300),
    updatedAt: new Date().toISOString()
  }
  save()
  res.json(db.site)
})

// ---- Automatic licences ----
// Licences are issued automatically when a school registers. The founder never
// fills anything in — they can only RE-ISSUE a licence for a school (e.g. when
// the current one has expired), which extends the expiry and signs a new code.
app.post('/api/founder/schools/:id/license', requireFounder, (req, res) => {
  const school = get().schools.find((s) => s.id === Number(req.params.id))
  if (!school) return res.status(404).json({ error: 'School not found' })
  issueLicense(school)
  save()
  res.json(school as SchoolRow)
})

// ---- Team members (public About page) ----
app.get('/api/team', (_req, res) => {
  const team = get()
    .team.filter((m) => m.published)
    .sort((a, b) => a.order - b.order || a.id - b.id)
  res.json(team)
})

app.get('/api/founder/team', requireFounder, (_req, res) => {
  res.json([...get().team].sort((a, b) => a.order - b.order || a.id - b.id))
})

app.post('/api/founder/team', requireFounder, (req, res) => {
  const name = clean(req.body?.name, 120)
  if (!name) return res.status(400).json({ error: 'A name is required.' })
  const db = get()
  const member: TeamMember = {
    id: nextId(),
    name,
    role: clean(req.body?.role, 120),
    bio: clean(req.body?.bio, 1000),
    photo: clean(req.body?.photo, 800_000), // data URLs allowed (resized client-side)
    order: Number.isFinite(Number(req.body?.order)) ? Number(req.body.order) : db.team.length,
    published: req.body?.published === true,
    createdAt: new Date().toISOString()
  }
  db.team.push(member)
  save()
  res.json(member)
})

app.patch('/api/founder/team/:id', requireFounder, (req, res) => {
  const m = get().team.find((x) => x.id === Number(req.params.id))
  if (!m) return res.status(404).json({ error: 'Team member not found' })
  const b = req.body ?? {}
  if (b.name !== undefined) m.name = clean(b.name, 120)
  if (b.role !== undefined) m.role = clean(b.role, 120)
  if (b.bio !== undefined) m.bio = clean(b.bio, 1000)
  if (b.photo !== undefined) m.photo = clean(b.photo, 800_000)
  if (b.order !== undefined && Number.isFinite(Number(b.order))) m.order = Number(b.order)
  if (typeof b.published === 'boolean') m.published = b.published
  save()
  res.json(m)
})

app.delete('/api/founder/team/:id', requireFounder, (req, res) => {
  const db = get()
  const i = db.team.findIndex((x) => x.id === Number(req.params.id))
  if (i === -1) return res.status(404).json({ error: 'Team member not found' })
  db.team.splice(i, 1)
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
  // A school's key is its telemetry identity — anyone who can guess it could
  // read or overwrite that school's stats via the telemetry endpoints. Math.random
  // is predictable, so use a cryptographically secure value instead.
  return 'sch_' + crypto.randomBytes(16).toString('hex')
}

app.listen(PORT, () => {
  console.log(`JuniorIgnite API listening on http://localhost:${PORT}`)
})
