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
  Building2
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { StatsEditor } from '@/components/founder/StatsEditor'
import { LicenseManager } from '@/components/founder/LicenseManager'
import { SiteSettingsEditor } from '@/components/founder/SiteSettingsEditor'
import { ContactInbox } from '@/components/founder/ContactInbox'
import { api, usingMock } from '@/lib/api'
import type { FounderOverview, SchoolRow } from '@/lib/types'

export default function FounderDashboard(): JSX.Element {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<FounderOverview | null>(null)
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [mock, setMock] = useState(false)

  async function load(): Promise<void> {
    setLoading(true)
    const [o, s] = await Promise.all([api.founderOverview(), api.founderSchools()])
    setOverview(o)
    setSchools(s)
    setMock(usingMock)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function logout(): void {
    api.founderLogout()
    navigate('/founder')
  }

  async function patch(id: number, p: Partial<Pick<SchoolRow, 'reportCardsAllowed' | 'status'>>): Promise<void> {
    setSavingId(id)
    // optimistic update
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
    try {
      const updated = await api.updateSchool(id, p)
      setSchools((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } finally {
      setSavingId(null)
    }
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
          <button onClick={logout} className="btn-ghost !py-2 text-sm">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="container-page py-8">
        <h1 className="text-2xl font-extrabold text-ink">Platform overview</h1>
        <p className="mt-1 text-ink-muted">Downloads, schools and usage across every JuniorIgnite installation.</p>

        {mock && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Demo mode — showing sample data because the backend API isn&apos;t connected. Start the server (in the
            desktop app repo) to see live numbers.
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Download} color="brand" label="Total downloads" value={t?.downloads ?? 0} />
              <StatCard
                icon={School}
                color="accent"
                label="Schools onboard"
                value={t?.schools ?? 0}
                hint={`${t?.schoolsActive ?? 0} active · ${t?.schoolsSuspended ?? 0} suspended`}
              />
              <StatCard icon={Users2} color="brand" label="Active users" value={t?.activeUsers ?? 0} />
              <StatCard icon={GraduationCap} color="accent" label="Students managed" value={t?.students ?? 0} />
            </div>

            {/* Charts */}
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Area type="monotone" dataKey="downloads" stroke="#158455" strokeWidth={2.5} fill="url(#dl)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-ink">Schools by region</h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview?.schoolsByRegion ?? []} margin={{ left: -22, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" vertical={false} />
                      <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="schools" fill="#f8850a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Founder-entered public figures + licence issuing */}
            <div className="mt-6 grid gap-6">
              <StatsEditor />
              <LicenseManager />
              <SiteSettingsEditor />
              <ContactInbox />
            </div>

            {/* Schools table */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-ink">School accounts</h3>
                  <p className="text-sm text-ink-muted">Manage each school and grant report-card generation.</p>
                </div>
                <div className="relative sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9" placeholder="Search school or region" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-ink-muted">
                      <th className="px-5 py-3 font-semibold">School</th>
                      <th className="px-3 py-3 font-semibold">Region</th>
                      <th className="px-3 py-3 text-right font-semibold">Students</th>
                      <th className="px-3 py-3 text-right font-semibold">Users</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Report cards</th>
                      <th className="px-5 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-ink">{s.name}</div>
                              <div className="text-xs text-ink-muted">{s.teachers} teachers</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-ink-soft">{s.region ?? '—'}</td>
                        <td className="px-3 py-3 text-right font-semibold text-ink">{s.students.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-ink-soft">{s.activeUsers}</td>
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
                        <td className="px-3 py-3">
                          <Toggle
                            on={s.reportCardsAllowed}
                            busy={savingId === s.id}
                            onChange={(v) => patch(s.id, { reportCardsAllowed: v })}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => patch(s.id, { reportCardsAllowed: !s.reportCardsAllowed })}
                              disabled={savingId === s.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-700"
                            >
                              <FileBadge className="h-3.5 w-3.5" />
                              {s.reportCardsAllowed ? 'Revoke' : 'Grant'}
                            </button>
                            <button
                              onClick={() => patch(s.id, { status: s.status === 'active' ? 'suspended' : 'active' })}
                              disabled={savingId === s.id}
                              className={
                                'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ' +
                                (s.status === 'active'
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border-brand-200 text-brand-700 hover:bg-brand-50')
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
                        <td colSpan={7} className="px-5 py-12 text-center text-ink-muted">No schools match your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

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
