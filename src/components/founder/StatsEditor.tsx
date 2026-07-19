import { useEffect, useState } from 'react'
import { Loader2, Save, CheckCircle2, BarChart3 } from 'lucide-react'
import { api } from '@/lib/api'
import type { PublicStatsInput } from '@/lib/types'

/**
 * Lets the founder set the headline figures shown on the public site.
 * JuniorIgnite schools run fully offline and never report in, so these cannot be
 * counted automatically — they are stated by the founder. Downloads are the one
 * genuinely automatic number and are therefore not editable here.
 */
export function StatsEditor(): JSX.Element {
  const [form, setForm] = useState({ schools: 0, students: 0, activeUsers: 0 })
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .founderStats()
      .then((s: PublicStatsInput) => {
        setForm({ schools: s.schools, students: s.students, activeUsers: s.activeUsers })
        setUpdatedAt(s.updatedAt)
      })
      .catch(() => setError('Could not load statistics.'))
      .finally(() => setLoading(false))
  }, [])

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const s = await api.saveFounderStats(form)
      setUpdatedAt(s.updatedAt)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Could not save. Check you are still signed in.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof form, hint: string): JSX.Element => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</label>
      <input
        type="number"
        min={0}
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: Math.max(0, Number(e.target.value)) }))}
      />
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-brand-600" />
        <h3 className="text-lg font-bold text-ink">Public statistics</h3>
      </div>
      <p className="mb-5 text-sm text-ink-muted">
        These appear on the public home page. Schools run offline, so they can't be counted automatically — enter the
        real figures here. Downloads are counted automatically and are not editable.
      </p>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {field('Schools onboard', 'schools', 'Schools actively using JuniorIgnite')}
            {field('Students managed', 'students', 'Total pupils across those schools')}
            {field('Active users', 'activeUsers', 'Admins & teachers using the app')}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save statistics
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
                <CheckCircle2 className="h-4 w-4" /> Saved — now live on the site
              </span>
            )}
            {updatedAt && !saved && (
              <span className="text-xs text-ink-muted">Last updated {new Date(updatedAt).toLocaleString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
