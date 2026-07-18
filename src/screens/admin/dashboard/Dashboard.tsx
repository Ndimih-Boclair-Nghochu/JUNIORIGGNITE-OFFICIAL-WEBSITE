import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, GraduationCap, School2, UserRound, ClipboardCheck, ShieldCheck, Wallet, History } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DashboardSummary, ActivityLogEntry } from '@shared/types'

function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'brand'
}: {
  icon: any
  label: string
  value: string
  tone?: 'brand' | 'accent' | 'red'
}): JSX.Element {
  const toneClasses =
    tone === 'accent' ? 'bg-accent-50 text-accent-600' : tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  )
}

export default function Dashboard(): JSX.Element {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [s, a] = await Promise.all([window.api.dashboard.summary(), window.api.dashboard.activity()])
      if (s.ok) setSummary(s.data ?? null)
      if (a.ok) setActivity(a.data ?? [])
      setLoading(false)
    })()
  }, [])

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-5 p-8 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100" />
        ))}
      </div>
    )
  }

  const fmt = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t('common.dashboard')}</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t('dashboard.totalStudents')} value={fmt.format(summary.totalStudents)} />
        <StatCard icon={GraduationCap} label={t('dashboard.totalTeachers')} value={fmt.format(summary.totalTeachers)} tone="accent" />
        <StatCard icon={School2} label={t('dashboard.totalClasses')} value={fmt.format(summary.totalClasses)} />
        <StatCard
          icon={UserRound}
          label={t('dashboard.boysGirls')}
          value={`${summary.boys} / ${summary.girls}`}
          tone="accent"
        />
        <StatCard
          icon={ClipboardCheck}
          label={t('dashboard.attendanceToday')}
          value={summary.attendanceTodayPresentPct !== null ? `${summary.attendanceTodayPresentPct}%` : '—'}
        />
        <StatCard
          icon={ShieldCheck}
          label={t('dashboard.licenseStatus')}
          value={summary.licenseStatus.toUpperCase()}
          tone={summary.licenseStatus === 'active' ? 'brand' : 'red'}
        />
        <StatCard icon={Wallet} label={t('dashboard.feesCollected')} value={`${fmt.format(summary.feesCollected)} FCFA`} />
        <StatCard
          icon={Wallet}
          label={t('dashboard.feesOutstanding')}
          value={`${fmt.format(summary.feesOutstanding)} FCFA`}
          tone={summary.feesOutstanding > 0 ? 'red' : 'brand'}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">{t('dashboard.boysGirls')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Boys', value: summary.boys },
                  { name: 'Girls', value: summary.girls }
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                <Cell fill="#158455" />
                <Cell fill="#f8850a" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-brand-600" />Boys ({summary.boys})</span>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-accent-500" />Girls ({summary.girls})</span>
          </div>
        </div>
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Fees ({t('common.term')})</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { name: 'Collected', value: summary.feesCollected },
              { name: 'Outstanding', value: summary.feesOutstanding }
            ]}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => `${fmt.format(v)} FCFA`} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#158455" />
                <Cell fill="#dc2626" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <History className="h-5 w-5 text-slate-400" />
          {t('dashboard.recentActivity')}
        </h2>
        <div className="card divide-y divide-slate-100 p-0">
          {activity.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No activity yet.</div>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <span className="font-medium text-slate-700">{a.actorLabel}</span>{' '}
                  <span className="text-slate-500">{a.action}</span>
                </div>
                <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
