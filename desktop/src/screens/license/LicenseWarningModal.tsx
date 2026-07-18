import { ShieldAlert, Clock } from 'lucide-react'
import type { LicenseInfo } from '@shared/types'
import { SUPPORT, LICENSE_FEE_PER_STUDENT_XAF, formatXaf } from '@shared/constants'

/**
 * Launch-time license expiry warning. Shown every time the app opens while the
 * license is active and inside a warning window. Prominence escalates as the
 * deadline nears: neutral brand → amber (≤30d) → red (≤7d).
 */
export default function LicenseWarningModal({
  license,
  onClose
}: {
  license: LicenseInfo
  onClose: () => void
}): JSX.Element {
  const days = license.daysRemaining
  const urgent = days <= 7
  const soon = days <= 30

  const tone = urgent
    ? { ring: 'ring-red-200', bg: 'bg-red-50', fg: 'text-red-600', btn: 'btn-danger' }
    : soon
      ? { ring: 'ring-amber-200', bg: 'bg-amber-50', fg: 'text-amber-600', btn: 'btn-primary' }
      : { ring: 'ring-brand-200', bg: 'bg-brand-50', fg: 'text-brand-600', btn: 'btn-primary' }

  const deadline = new Date(license.expiresAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className={`w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-xl ring-1 ${tone.ring}`}>
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${tone.bg}`}>
          {urgent ? <ShieldAlert className={`h-8 w-8 ${tone.fg}`} /> : <Clock className={`h-8 w-8 ${tone.fg}`} />}
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900">{SUPPORT.product} License Notice</h2>
        <p className="mt-2 leading-relaxed text-slate-600">
          Your {SUPPORT.product} license expires in{' '}
          <span className={`font-bold ${tone.fg}`}>
            {days} {days === 1 ? 'day' : 'days'}
          </span>{' '}
          — on {deadline}. Renew your license before the deadline to avoid interruption of service. Contact{' '}
          {SUPPORT.vendor} for your activation code.
        </p>

        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Amount to renew</div>
          <div className="mt-0.5 text-lg font-bold text-slate-900">{formatXaf(license.feeTotalXaf)}</div>
          <div className="text-xs text-slate-500">
            {license.studentCount} {license.studentCount === 1 ? 'student' : 'students'} × {formatXaf(LICENSE_FEE_PER_STUDENT_XAF)}
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Contact {SUPPORT.vendor}</div>
          <div className="mt-0.5 font-mono text-base font-semibold text-slate-900">
            {SUPPORT.phonePrimary} · {SUPPORT.phoneSecondary}
          </div>
        </div>

        <button className={`${tone.btn} mt-6 w-full`} onClick={onClose}>
          Continue
        </button>
        <p className="mt-3 text-xs text-slate-400">Thank you for using {SUPPORT.product}.</p>
      </div>
    </div>
  )
}
