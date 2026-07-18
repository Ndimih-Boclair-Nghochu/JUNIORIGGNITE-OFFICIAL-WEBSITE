import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Clock, KeyRound, LifeBuoy } from 'lucide-react'
import type { LicenseInfo } from '@shared/types'
import { SUPPORT, LICENSE_FEE_PER_STUDENT_XAF, formatXaf } from '@shared/constants'

export default function LicensePage(): JSX.Element {
  const navigate = useNavigate()
  const [info, setInfo] = useState<LicenseInfo | null>(null)
  const [loading, setLoading] = useState(true)

  async function load(): Promise<void> {
    const res = await window.api.license.status()
    if (res.ok) setInfo(res.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  if (loading || !info) {
    return (
      <div className="p-8">
        <div className="card h-40 max-w-xl animate-pulse bg-slate-100" />
      </div>
    )
  }

  const isActive = info.status === 'active'
  const warning = info.warningThreshold !== null
  const tone = !isActive
    ? { icon: ShieldAlert, chip: 'bg-red-50', fg: 'text-red-600', label: 'EXPIRED' }
    : warning
      ? { icon: Clock, chip: 'bg-amber-50', fg: 'text-amber-600', label: info.provisional ? 'PROVISIONAL' : 'ACTIVE' }
      : { icon: ShieldCheck, chip: 'bg-brand-50', fg: 'text-brand-600', label: info.provisional ? 'PROVISIONAL' : 'ACTIVE' }
  const Icon = tone.icon

  const fmt = (d: string): string =>
    d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">License</h1>

      <div className="card max-w-xl">
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${tone.chip}`}>
            <Icon className={`h-8 w-8 ${tone.fg}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold ${tone.fg}`}>{tone.label}</div>
            <div className="text-sm text-slate-500">
              {info.daysRemaining > 0
                ? `${info.daysRemaining} ${info.daysRemaining === 1 ? 'day' : 'days'} remaining`
                : `Expired ${Math.abs(info.daysRemaining)} ${Math.abs(info.daysRemaining) === 1 ? 'day' : 'days'} ago`}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Enrolled students</dt>
            <dd className="font-medium text-slate-800">{info.studentCount}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Annual fee ({formatXaf(LICENSE_FEE_PER_STUDENT_XAF)}/student)</dt>
            <dd className="font-bold text-slate-900">{formatXaf(info.feeTotalXaf)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Issued</dt>
            <dd className="font-medium text-slate-800">{fmt(info.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Expires</dt>
            <dd className="font-medium text-slate-800">{fmt(info.expiresAt)}</dd>
          </div>
        </dl>

        {info.provisional && (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You're running on the first-year provisional license included with installation. Your school owes{' '}
            <span className="font-semibold">{formatXaf(info.feeTotalXaf)}</span> for the year ({info.studentCount}{' '}
            {info.studentCount === 1 ? 'student' : 'students'} × {formatXaf(LICENSE_FEE_PER_STUDENT_XAF)}). Activate your{' '}
            {SUPPORT.product} license before it expires to keep using {SUPPORT.product} without interruption.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={() => navigate('/admin/activate')}>
            <KeyRound className="h-5 w-5" />
            {info.provisional || !isActive ? 'Activate License' : 'Renew / Re-activate'}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/admin/support')}>
            <LifeBuoy className="h-5 w-5" />
            Contact Support
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Licenses are verified locally and never require an internet connection. Each license is bound to this School ID
          and Device ID and cannot be moved to another computer. Every annual license runs until the last day of
          February.
        </p>
      </div>
    </div>
  )
}
