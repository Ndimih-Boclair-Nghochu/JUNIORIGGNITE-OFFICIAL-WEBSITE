import { useEffect, useRef, useState } from 'react'
import { KeyRound, Copy, Check, Loader2, ShieldCheck, Upload, Wallet } from 'lucide-react'
import type { LicenseInfo, RegistrationInfo } from '@shared/types'
import { SUPPORT, LICENSE_FEE_PER_STUDENT_XAF, formatXaf } from '@shared/constants'

/**
 * Reusable license-activation panel. Shows the School ID + Device ID the school
 * must give ELIGNITE, accepts a pasted activation code or an imported `.lic`
 * file, verifies it locally, and unlocks the app on success. Used both inside
 * the admin area and on the expired lock screen.
 */
export default function ActivateLicensePage({
  onActivated
}: {
  onActivated?: (license: LicenseInfo) => void
}): JSX.Element {
  const [reg, setReg] = useState<RegistrationInfo | null>(null)
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [showIds, setShowIds] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activated, setActivated] = useState<LicenseInfo | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.license.registrationInfo().then((res) => {
      if (res.ok) setReg(res.data ?? null)
    })
    window.api.license.status().then((res) => {
      if (res.ok) setLicense(res.data ?? null)
    })
  }, [])

  async function copy(label: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard unavailable — the value is still visible to type manually */
    }
  }

  async function handleActivate(): Promise<void> {
    setBusy(true)
    setError(null)
    const res = await window.api.license.activate({ code })
    setBusy(false)
    if (res.ok && res.data) {
      setActivated(res.data.license)
      onActivated?.(res.data.license)
    } else {
      setError(res.error ?? 'Activation failed. Please try again.')
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCode(String(reader.result ?? '').trim())
    reader.readAsText(file)
    e.target.value = ''
  }

  if (activated) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
          <ShieldCheck className="h-8 w-8 text-brand-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">License activated successfully</h2>
        <p className="mt-2 text-slate-600">
          Valid until{' '}
          <span className="font-semibold text-slate-900">
            {new Date(activated.expiresAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </span>
          .
        </p>
        <p className="mt-1 text-sm text-slate-500">Every feature is now unlocked. Thank you for using JuniorIgnite.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
            <KeyRound className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Activate License</h2>
            <p className="text-sm text-slate-500">Enter the activation code provided by ELIGNITE.</p>
          </div>
        </div>

        {/* Amount the school must pay for the year: 150 XAF per enrolled student. */}
        {license && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700">
              <Wallet className="h-4 w-4" />
              Amount payable this academic year
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{formatXaf(license.feeTotalXaf)}</div>
            <div className="mt-0.5 text-sm text-slate-600">
              {license.studentCount} {license.studentCount === 1 ? 'student' : 'students'} × {formatXaf(LICENSE_FEE_PER_STUDENT_XAF)} per student
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Pay via Mobile Money to <span className="font-semibold">{SUPPORT.mobileMoney}</span>, then contact {SUPPORT.vendor}
              for your activation code.
            </div>
          </div>
        )}

        {/* Identifiers kept available (collapsed) so ELIGNITE support can bind the code. */}
        {reg && (
          <div className="mt-3">
            <button
              type="button"
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              onClick={() => setShowIds((v) => !v)}
            >
              {showIds ? 'Hide' : 'Show'} School ID &amp; Device ID (for support)
            </button>
            {showIds && (
              <div className="mt-2 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <IdField label="School ID" value={reg.schoolId} copied={copied === 'School ID'} onCopy={() => copy('School ID', reg.schoolId)} />
                <IdField label="Device ID" value={reg.deviceId} copied={copied === 'Device ID'} onCopy={() => copy('Device ID', reg.deviceId)} />
              </div>
            )}
          </div>
        )}

        <label className="label-field mt-5">Activation code</label>
        <textarea
          className="input-field h-28 resize-none font-mono text-sm"
          placeholder="Paste your activation code here…"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(null)
          }}
        />

        {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={handleActivate} disabled={busy || !code.trim()}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            Activate License
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-5 w-5" />
            Import .lic file
          </button>
          <input ref={fileRef} type="file" accept=".lic,.txt" className="hidden" onChange={handleImportFile} />
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Don't have a code yet? Contact {SUPPORT.vendor} on {SUPPORT.phonePrimary} or {SUPPORT.phoneSecondary} with your
          School ID and Device ID above. Activation works fully offline — no internet is required.
        </p>
      </div>
    </div>
  )
}

function IdField({
  label,
  value,
  copied,
  onCopy
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}): JSX.Element {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-sm text-slate-800 ring-1 ring-slate-200">
          {value}
        </code>
        <button
          onClick={onCopy}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600"
          title={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
