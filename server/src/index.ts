import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { load, save, get, nextId, downloadsByDay, type SchoolRow } from './store.js'
import { signToken, verifyToken, verifyPassword } from './auth.js'

load()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = Number(process.env.PORT ?? 4000)
const INSTALLER_URL = process.env.INSTALLER_URL ?? '/downloads/JuniorIgnite-Setup-1.0.0.exe'
const APP_VERSION = process.env.APP_VERSION ?? '1.0.0'

const totals = () => {
  const s = get().schools
  return {
    downloads: get().downloads,
    schools: s.length,
    students: s.reduce((a, r) => a + r.students, 0),
    activeUsers: s.reduce((a, r) => a + r.activeUsers, 0),
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

app.post('/api/download', (_req, res) => {
  const db = get()
  db.downloads += 1
  db.downloadEvents.push({ ts: new Date().toISOString() })
  save()
  res.json({ url: INSTALLER_URL, version: APP_VERSION })
})

app.post('/api/contact', (req, res) => {
  const { name, email, organization, message } = req.body ?? {}
  if (!name || !email || !message) return res.status(400).json({ error: 'name, email and message are required' })
  const db = get()
  db.contacts.push({ id: nextId(), name, email, organization, message, createdAt: new Date().toISOString() })
  save()
  res.json({ ok: true })
})

// ---------------- Telemetry (from desktop installs) ----------------
app.post('/api/telemetry/register', (req, res) => {
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

app.post('/api/telemetry/heartbeat', (req, res) => {
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

app.get('/api/telemetry/permission/:key', (req, res) => {
  const school = get().schools.find((s) => s.key === req.params.key)
  if (!school) return res.status(404).json({ error: 'unknown school' })
  res.json({ reportCardsAllowed: school.reportCardsAllowed, status: school.status })
})

// ---------------- Founder ----------------
app.post('/api/founder/login', (req, res) => {
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
