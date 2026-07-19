import { useEffect, useState } from 'react'
import { KeyRound, Plus, Copy, Check, Trash2, Loader2, ShieldCheck, Terminal } from 'lucide-react'
import { api } from '@/lib/api'
import type { LicenseRow } from '@/lib/types'

/**
 * Issues activation codes for schools.
 *
 * The Ed25519 PRIVATE key deliberately never touches this server — if it did, a
 * breach would let anyone mint unlimited licences. So the flow is:
 *   1. Record the school's School ID + Device ID here.
 *   2. Copy the generated `license-gen` command and run it on your own machine.
 *   3. Paste the signed code back so there is a record of what was issued.
 */
export function LicenseManager(): JSX.Element {
  const [rows, setRows] = useState<LicenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({ schoolName: '', schoolId: '', deviceId: '', expiresAt: '', notes: '' })
  const [codeDraft, setCodeDraft] = useState<Record<number, string>>({})

  async function load(): Promise<void> {
    setLoading(true)
    try {
      setRows(await api.licenses())
    } catch {
      setError('Could not load licences.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function copy(label: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      /* clipboard blocked — the value is still selectable on screen */
    }
  }

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.schoolName.trim() || !form.schoolId.trim() || !form.deviceId.trim()) return
    setAdding(true)
    setError(null)
    try {
      await api.createLicense(form)
      setForm({ schoolName: '', schoolId: '', deviceId: '', expiresAt: '', notes: '' })
      await load()
    } catch {
      setError('Could not save the licence record.')
    } finally {
      setAdding(false)
    }
  }

  async function saveCode(row: LicenseRow): Promise<void> {
    const code = (codeDraft[row.id] ?? '').trim()
    if (!code) return
    await api.updateLicense(row.id, { code })
    setCodeDraft((d) => ({ ...d, [row.id]: '' }))
    await load()
  }

  async function remove(row: LicenseRow): Promise<void> {
    if (!confirm(`Delete the licence record for ${row.schoolName}?`)) return
    await api.deleteLicense(row.id)
    await load()
  }

  const cmdFor = (r: LicenseRow): string =>
    `node license-gen.mjs issue --school ${r.schoolId} --device ${r.deviceId}` +
    (r.expiresAt ? ` --until ${r.expiresAt}` : '')

  const input = (ph: string, key: keyof typeof form, type = 'text'): JSX.Element => (
    <input
      type={type}
      placeholder={ph}
      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
    />
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-brand-600" />
        <h3 className="text-lg font-bold text-ink">School licences</h3>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        Record a school, then generate its signed activation code on your own machine. The signing key is never stored
        on this server, so a breach here cannot forge licences.
      </p>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      <form onSubmit={add} className="mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        {input('School name', 'schoolName')}
        {input('School ID (e.g. JI-4F9A-2C7B)', 'schoolId')}
        {input('Device ID (from the school’s app)', 'deviceId')}
        {input('Expires (YYYY-MM-DD, optional)', 'expiresAt')}
        <div className="sm:col-span-2">{input('Notes (optional)', 'notes')}</div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            disabled={adding}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add school licence
          </button>
        </div>
      </form>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-ink-muted">
          No licences yet. Add a school above once they send you their School ID and Device ID.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-ink">{r.schoolName}</div>
                  <div className="font-mono text-xs text-ink-muted">
                    {r.schoolId} · {r.deviceId}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.code ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Issued
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  )}
                  <button
                    onClick={() => remove(r)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Step 1 — the command to run offline */}
              <div className="mt-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <Terminal className="h-3.5 w-3.5" />
                  Run this in tools/license-gen on your machine
                </div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
                    {cmdFor(r)}
                  </code>
                  <button
                    onClick={() => copy(`cmd-${r.id}`, cmdFor(r))}
                    className="shrink-0 rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50"
                    title="Copy command"
                  >
                    {copied === `cmd-${r.id}` ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Step 2 — paste the generated code back */}
              {r.code ? (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Activation code — send this to the school
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-ink ring-1 ring-slate-200">
                      {r.code}
                    </code>
                    <button
                      onClick={() => copy(`code-${r.id}`, r.code!)}
                      className="shrink-0 rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50"
                      title="Copy activation code"
                    >
                      {copied === `code-${r.id}` ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  {r.issuedAt && (
                    <p className="mt-1 text-xs text-ink-muted">Issued {new Date(r.issuedAt).toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    placeholder="Paste the generated activation code here…"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-500 focus:outline-none"
                    value={codeDraft[r.id] ?? ''}
                    onChange={(e) => setCodeDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => saveCode(r)}
                    className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Save code
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
