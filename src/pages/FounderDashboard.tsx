import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import {
  Download,
  School,
  Users2,
  GraduationCap,
  LogOut,
  Search,
  FileBadge,
  Ban,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Building2,
  LayoutDashboard,
  Globe,
  Inbox,
  KeyRound,
  Copy,
  RefreshCw
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { StatsEditor } from '@/components/founder/StatsEditor'
import { SiteSettingsEditor } from '@/components/founder/SiteSettingsEditor'
import { ContactInbox } from '@/components/founder/ContactInbox'
import { TeamEditor } from '@/components/founder/TeamEditor'
import { api, usingMock } from '@/lib/api'
import type { FounderOverview, SchoolRow } from '@/lib/types'

type TabId = 'overview' | 'schools' | 'team' | 'content' | 'messages'

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'schools', label: 'Schools', icon: School },
  { id: 'team', label: 'Team', icon: Users2 },
  { id: 'content', label: 'Site & Content', icon: Globe },
  { id: 'messages', label: 'Messages', icon: Inbox }
]

export default function FounderDashboard(): JSX.Element {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('overview')
  const [overview, setOverview] = useState<FounderOverview | null>(null)
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [messagesCount, setMessagesCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [mock, setMock] = useState(false)

  async function load(): Promise<void> {
    setLoading(true)
    const [o, s] = await Promise.all([api.founderOverview(), api.founderSchools()])
    setOverview(o)
    setSchools(s)
    setMock(usingMock)
    setLoading(false)
    api
      .contacts()
      .then((c) => setMessagesCount(c.length))
      .catch(() => {})
  }

  useEffect(() => {
    load()
  }, [])

  function logout(): void {
    api.founderLogout()
    navigate('/founder')
  }

  const t = overview?.totals

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 sm:inline">
              Founder console
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-700 sm:inline-flex"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={logout} className="btn-ghost !py-2 text-sm">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="container-page py-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
        {/* Sidebar nav (desktop) */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ' +
                  (tab === tb.id ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-soft hover:bg-slate-100')
                }
              >
                <tb.icon className="h-4.5 w-4.5" />
                {tb.label}
                {tb.id === 'messages' && messagesCount > 0 && (
                  <span
                    className={
                      'ml-auto rounded-full px-2 py-0.5 text-xs font-bold ' +
                      (tab === tb.id ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700')
                    }
                  >
                    {messagesCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {/* Mobile tabs */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ' +
                  (tab === tb.id ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-ink-soft')
                }
              >
                <tb.icon className="h-4 w-4" />
                {tb.label}
              </button>
            ))}
          </div>

          {mock && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Can’t reach the API — showing empty data. Check the server is running.
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <>
              {tab === 'overview' && <OverviewTab overview={overview} totals={t} />}
              {tab === 'schools' && <SchoolsTab schools={schools} setSchools={setSchools} />}
              {tab === 'team' && <TeamEditor />}
              {tab === 'content' && (
                <div className="grid gap-6">
                  <StatsEditor />
                  <SiteSettingsEditor />
                </div>
              )}
              {tab === 'messages' && <ContactInbox />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

/* ----------------------------- Overview ----------------------------- */
function OverviewTab({
  overview,
  totals
}: {
  overview: FounderOverview | null
  totals: FounderOverview['totals'] | undefined
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Platform overview</h1>
        <p className="mt-1 text-ink-muted">Downloads, schools and usage across every JuniorIgnite installation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Download} color="brand" label="Total downloads" value={totals?.downloads ?? 0} />
        <StatCard
          icon={School}
          color="accent"
          label="Schools onboard"
          value={totals?.schools ?? 0}
          hint={`${totals?.schoolsActive ?? 0} active · ${totals?.schoolsSuspended ?? 0} suspended`}
        />
        <StatCard icon={Users2} color="brand" label="Active users" value={totals?.activeUsers ?? 0} />
        <StatCard icon={GraduationCap} color="accent" label="Students managed" value={totals?.students ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-ink">Downloads · last 14 days</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.downloadsByDay ?? []} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22a56a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22a56a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="downloads" stroke="#158455" strokeWidth={2.5} fill="url(#dl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-ink">Schools by region</h3>
          <div className="mt-4 h-64">
            {overview && overview.schoolsByRegion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.schoolsByRegion} margin={{ left: -22, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" vertical={false} />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="schools" fill="#f8850a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-muted">
                No schools have registered yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Schools ----------------------------- */
function SchoolsTab({
  schools,
  setSchools
}: {
  schools: SchoolRow[]
  setSchools: React.Dispatch<React.SetStateAction<SchoolRow[]>>
}): JSX.Element {
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [renewingId, setRenewingId] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  async function patch(id: number, p: Partial<Pick<SchoolRow, 'reportCardsAllowed' | 'status'>>): Promise<void> {
    setSavingId(id)
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
    try {
      const updated = await api.updateSchool(id, p)
      setSchools((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } finally {
      setSavingId(null)
    }
  }

  async function renew(id: number): Promise<void> {
    setRenewingId(id)
    try {
      const updated = await api.renewLicense(id)
      setSchools((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } finally {
      setRenewingId(null)
    }
  }

  function copyCode(id: number, code: string): void {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(id)
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600)
    })
  }

  const filtered = useMemo(
    () =>
      schools.filter((s) => {
        if (!search) return true
        const q = search.toLowerCase()
        return s.name.toLowerCase().includes(q) || (s.region ?? '').toLowerCase().includes(q)
      }),
    [schools, search]
  )

  const isExpired = (iso: string | null): boolean => !!iso && new Date(iso).getTime() < Date.now()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">School accounts</h3>
          <p className="text-sm text-ink-muted">
            Licences are issued automatically when a school registers. Use <strong>Generate</strong> to re-issue an
            expired one.
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search school or region" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-5 py-3 font-semibold">School</th>
              <th className="px-3 py-3 font-semibold">Region</th>
              <th className="px-3 py-3 text-right font-semibold">Students</th>
              <th className="px-3 py-3 font-semibold">Licence</th>
              <th className="px-3 py-3 font-semibold">Report cards</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0 align-top hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink">{s.name}</div>
                      <div className="text-xs text-ink-muted">
                        {s.teachers} teachers · {s.activeUsers} users
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink-soft">{s.region ?? '—'}</td>
                <td className="px-3 py-3 text-right font-semibold text-ink">{s.students.toLocaleString()}</td>
                <td className="px-3 py-3">
                  {s.licenseCode ? (
                    <div>
                      <button
                        onClick={() => copyCode(s.id, s.licenseCode!)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-ink hover:bg-slate-200"
                        title="Copy activation code"
                      >
                        <KeyRound className="h-3 w-3 text-brand-600" />
                        {s.licenseCode}
                        {copied === s.id ? <CheckCircle2 className="h-3 w-3 text-brand-600" /> : <Copy className="h-3 w-3 text-ink-muted" />}
                      </button>
                      <div className={'mt-1 text-xs ' + (isExpired(s.licenseExpiresAt) ? 'font-semibold text-red-600' : 'text-ink-muted')}>
                        {isExpired(s.licenseExpiresAt) ? 'Expired ' : 'Expires '}
                        {s.licenseExpiresAt ? new Date(s.licenseExpiresAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-muted">Not issued</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Toggle on={s.reportCardsAllowed} busy={savingId === s.id} onChange={(v) => patch(s.id, { reportCardsAllowed: v })} />
                </td>
                <td className="px-3 py-3">
                  <span
                    className={
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                      (s.status === 'active' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600')
                    }
                  >
                    {s.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => renew(s.id)}
                      disabled={renewingId === s.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                      title="Issue a fresh licence (extends the expiry)"
                    >
                      {renewingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileBadge className="h-3.5 w-3.5" />}
                      {s.licenseCode ? 'Renew' : 'Generate'}
                    </button>
                    <button
                      onClick={() => patch(s.id, { status: s.status === 'active' ? 'suspended' : 'active' })}
                      disabled={savingId === s.id}
                      className={
                        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ' +
                        (s.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-brand-200 text-brand-700 hover:bg-brand-50')
                      }
                    >
                      {s.status === 'active' ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {s.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-ink-muted">
                  {schools.length === 0 ? 'No schools have registered yet.' : 'No schools match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ----------------------------- shared bits ----------------------------- */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color
}: {
  icon: typeof Download
  label: string
  value: number
  hint?: string
  color: 'brand' | 'accent'
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        <div className={'flex h-9 w-9 items-center justify-center rounded-xl ' + (color === 'brand' ? 'bg-brand-50 text-brand-600' : 'bg-accent-50 text-accent-600')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-extrabold text-ink">{value.toLocaleString()}</div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  )
}

function Toggle({ on, onChange, busy }: { on: boolean; onChange: (v: boolean) => void; busy: boolean }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={busy}
      className={'relative inline-flex h-6 w-11 items-center rounded-full transition ' + (on ? 'bg-brand-600' : 'bg-slate-300')}
      aria-pressed={on}
    >
      <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition ' + (on ? 'translate-x-6' : 'translate-x-1')} />
      {busy && <Loader2 className="absolute -right-6 h-4 w-4 animate-spin text-slate-400" />}
    </button>
  )
}
