import { useEffect, useState } from 'react'
import { Loader2, Save, CheckCircle2, Globe } from 'lucide-react'
import { api } from '@/lib/api'
import type { SiteSettings } from '@/lib/types'

const BLANK: SiteSettings = {
  email: '',
  phone: '',
  address: '',
  hours: '',
  eligniteUrl: '',
  youtube: '',
  facebook: '',
  updatedAt: null
}

/**
 * Contact details and outbound links for the whole public site. Saving here
 * updates the footer, the contact page and anywhere else they appear — no
 * redeploy needed.
 */
export function SiteSettingsEditor(): JSX.Element {
  const [form, setForm] = useState<SiteSettings>(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .siteSettings()
      .then(setForm)
      .catch(() => setError('Could not load site settings.'))
      .finally(() => setLoading(false))
  }, [])

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      setForm(await api.saveSiteSettings(form))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Could not save. Check you are still signed in.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof SiteSettings, placeholder = '', hint?: string): JSX.Element => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</label>
      <input
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        placeholder={placeholder}
        value={(form[key] as string) ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Globe className="h-5 w-5 text-brand-600" />
        <h3 className="text-lg font-bold text-ink">Site contact details &amp; links</h3>
      </div>
      <p className="mb-5 text-sm text-ink-muted">
        These appear across the public website. Changing them here updates every page instantly.
      </p>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Email', 'email', 'juniorignitecmr@gmail.com')}
            {field('Phone', 'phone', '+237 678 897 272')}
            {field('Address', 'address', 'Bamenda, North West Region, Cameroon')}
            {field('Opening hours', 'hours', 'Mon – Sat: 8:00 AM – 6:00 PM')}
            <div className="sm:col-span-2">
              {field(
                'ELIGNITE website',
                'eligniteUrl',
                'https://elignite.com',
                'Where "POWERED BY ELIGNITE" in the footer links to.'
              )}
            </div>
            {field('YouTube URL', 'youtube', 'https://youtube.com/@…', 'Leave blank to hide the icon.')}
            {field('Facebook URL', 'facebook', 'https://facebook.com/…', 'Leave blank to hide the icon.')}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save details
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
                <CheckCircle2 className="h-4 w-4" /> Saved — live on the site
              </span>
            )}
            {form.updatedAt && !saved && (
              <span className="text-xs text-ink-muted">Last updated {new Date(form.updatedAt).toLocaleString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
