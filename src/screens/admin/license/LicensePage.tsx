import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react'
import type { LicenseInfo } from '@shared/types'

export default function LicensePage(): JSX.Element {
  const [info, setInfo] = useState<LicenseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState(false)

  async function load(): Promise<void> {
    const res = await window.api.license.status()
    if (res.ok) setInfo(res.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRenew(): Promise<void> {
    setRenewing(true)
    const res = await window.api.license.renew()
    if (res.ok) setInfo(res.data ?? null)
    setRenewing(false)
  }

  if (loading || !info) return <div className="p-8"><div className="card h-40 animate-pulse bg-slate-100" /></div>

  const isActive = info.status === 'active'
  const statusColor = isActive ? 'text-brand-600' : info.status === 'grace' ? 'text-accent-600' : 'text-red-600'

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">License</h1>

      <div className="card max-w-xl">
        <div className="flex items-center gap-4">
          <div className={'flex h-16 w-16 items-center justify-center rounded-2xl ' + (isActive ? 'bg-brand-50' : 'bg-red-50')}>
            {isActive ? <ShieldCheck className="h-8 w-8 text-brand-600" /> : <ShieldAlert className="h-8 w-8 text-red-600" />}
          </div>
          <div>
            <div className={'text-2xl font-bold ' + statusColor}>{info.status.toUpperCase()}</div>
            <div className="text-sm text-slate-500">
              {info.daysRemaining > 0
                ? `${info.daysRemaining} days remaining`
                : `Expired ${Math.abs(info.daysRemaining)} days ago`}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Issued</dt>
            <dd className="font-medium text-slate-800">{info.issuedAt ? new Date(info.issuedAt).toLocaleDateString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Expires</dt>
            <dd className="font-medium text-slate-800">{info.expiresAt ? new Date(info.expiresAt).toLocaleDateString() : '—'}</dd>
          </div>
        </dl>

        {!isActive && (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            The app is in read-only grace mode. Existing data can still be viewed and exported, but new records cannot be
            created until the license is renewed.
          </div>
        )}

        <button className="btn-primary mt-6" onClick={handleRenew} disabled={renewing}>
          {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Renew license (1 year)
        </button>
        <p className="mt-2 text-xs text-slate-400">
          Renewal runs locally in this demo. In production this calls the licensing server; the interface is the same.
        </p>
      </div>
    </div>
  )
}
