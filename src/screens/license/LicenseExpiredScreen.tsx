import { useEffect, useState } from 'react'
import { ShieldAlert, KeyRound, LifeBuoy, Power, ArrowLeft } from 'lucide-react'
import type { LicenseInfo } from '@shared/types'
import { SUPPORT, LICENSE_FEE_PER_STUDENT_XAF, formatXaf } from '@shared/constants'
import ActivateLicensePage from './ActivateLicensePage'
import SupportPage from '../support/SupportPage'

type View = 'locked' | 'activate' | 'support'

/**
 * Full-window hard lock shown when the license has expired. Nothing else in the
 * app is reachable — only Activate License, Contact Support, and Exit. All
 * school data stays safely on disk; a successful activation restores full
 * access immediately (via onActivated → the app re-checks the license).
 */
export default function LicenseExpiredScreen({ onActivated }: { onActivated: () => void }): JSX.Element {
  const [view, setView] = useState<View>('locked')
  const [license, setLicense] = useState<LicenseInfo | null>(null)

  useEffect(() => {
    window.api.license.status().then((res) => {
      if (res.ok) setLicense(res.data ?? null)
    })
  }, [])

  function handleActivated(_license: LicenseInfo): void {
    // Give the success confirmation a moment, then re-enter the app.
    setTimeout(onActivated, 1400)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        {view === 'locked' && (
          <div className="w-full max-w-lg text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50">
              <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">License Expired</h1>
            <p className="mx-auto mt-3 max-w-md leading-relaxed text-slate-600">
              Your {SUPPORT.product} license has expired. To continue using {SUPPORT.product}, please renew your annual
              license. Contact {SUPPORT.vendor} to receive your new activation code.
            </p>

            {license && (
              <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl bg-amber-50 px-8 py-4 ring-1 ring-amber-200">
                <span className="text-xs font-medium uppercase tracking-wide text-amber-700">Amount to renew</span>
                <span className="text-2xl font-bold text-slate-900">{formatXaf(license.feeTotalXaf)}</span>
                <span className="text-xs text-slate-500">
                  {license.studentCount} {license.studentCount === 1 ? 'student' : 'students'} × {formatXaf(LICENSE_FEE_PER_STUDENT_XAF)}
                </span>
              </div>
            )}

            <div className="mx-auto mt-4 inline-flex flex-col items-center gap-1 rounded-2xl bg-white px-8 py-4 shadow-sm ring-1 ring-slate-200">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Contact {SUPPORT.vendor}</span>
              <span className="font-mono text-xl font-bold text-slate-900">{SUPPORT.phonePrimary}</span>
              <span className="font-mono text-xl font-bold text-slate-900">{SUPPORT.phoneSecondary}</span>
            </div>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <button className="btn-primary" onClick={() => setView('activate')}>
                <KeyRound className="h-5 w-5" />
                Activate License
              </button>
              <button className="btn-secondary" onClick={() => setView('support')}>
                <LifeBuoy className="h-5 w-5" />
                Contact Support
              </button>
              <button className="btn-danger" onClick={() => window.api.app.quit()}>
                <Power className="h-5 w-5" />
                Exit Application
              </button>
            </div>

            <p className="mt-8 text-xs text-slate-400">
              Your school's data is safe and preserved. Nothing is lost — activation restores full access instantly.
            </p>
          </div>
        )}

        {view === 'activate' && (
          <div className="w-full">
            <BackBar onBack={() => setView('locked')} />
            <ActivateLicensePage onActivated={handleActivated} />
          </div>
        )}

        {view === 'support' && (
          <div className="w-full">
            <BackBar onBack={() => setView('locked')} />
            <SupportPage onActivate={() => setView('activate')} onClose={() => setView('locked')} />
          </div>
        )}
      </div>
    </div>
  )
}

function BackBar({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <div className="mx-auto mb-4 max-w-2xl">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
    </div>
  )
}
