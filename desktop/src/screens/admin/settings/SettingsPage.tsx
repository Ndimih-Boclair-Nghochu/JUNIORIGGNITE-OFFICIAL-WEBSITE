import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, ImagePlus, Save, KeyRound } from 'lucide-react'
import { useAppStore } from '../../../store/appStore'
import i18n from '../../../i18n'
import type { School, Language } from '@shared/types'

export default function SettingsPage(): JSX.Element {
  const { t } = useTranslation()
  const refreshApp = useAppStore((s) => s.refresh)
  const [school, setSchool] = useState<School | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.settings.get()
      if (res.ok) setSchool(res.data ?? null)
    })()
  }, [])

  function update<K extends keyof School>(key: K, value: School[K]): void {
    setSchool((s) => (s ? { ...s, [key]: value } : s))
  }

  async function handlePickLogo(): Promise<void> {
    const res = await window.api.files.pickImage()
    if (res.ok && res.data?.path) update('logoPath', res.data.path)
  }

  async function handleSave(): Promise<void> {
    if (!school) return
    setSaving(true)
    const res = await window.api.settings.update(school)
    setSaving(false)
    if (res.ok) {
      i18n.changeLanguage(school.language)
      await refreshApp()
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    }
  }

  if (!school) return <div className="p-8"><div className="card h-64 animate-pulse bg-slate-100" /></div>

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t('common.settings')}</h1>

      <div className="card max-w-2xl space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            {school.logoPath ? (
              <img src={`file:///${school.logoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-7 w-7 text-slate-300" />
            )}
          </div>
          <button className="btn-secondary" onClick={handlePickLogo}>
            {t('setup.uploadLogo')}
          </button>
        </div>

        <div>
          <label className="label-field">{t('setup.schoolName')}</label>
          <input className="input-field" value={school.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div>
          <label className="label-field">{t('setup.motto')}</label>
          <input className="input-field" value={school.motto ?? ''} onChange={(e) => update('motto', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">{t('setup.phone')}</label>
            <input className="input-field" value={school.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div>
            <label className="label-field">{t('setup.email')}</label>
            <input className="input-field" value={school.email ?? ''} onChange={(e) => update('email', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label-field">{t('setup.address')}</label>
          <input className="input-field" value={school.address ?? ''} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label-field">{t('setup.region')}</label>
            <input className="input-field" value={school.region ?? ''} onChange={(e) => update('region', e.target.value)} />
          </div>
          <div>
            <label className="label-field">{t('setup.division')}</label>
            <input className="input-field" value={school.division ?? ''} onChange={(e) => update('division', e.target.value)} />
          </div>
          <div>
            <label className="label-field">{t('setup.subdivision')}</label>
            <input className="input-field" value={school.subdivision ?? ''} onChange={(e) => update('subdivision', e.target.value)} />
          </div>
        </div>
        {/* Printed on report cards: the P.O. Box line under the school name and
            the name under the PRINCIPAL signature. */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">P.O. Box</label>
            <input
              className="input-field"
              placeholder="e.g. 450"
              value={school.poBox ?? ''}
              onChange={(e) => update('poBox', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Village / Town</label>
            <input
              className="input-field"
              placeholder="e.g. Yaoundé - Cameroon"
              value={school.villageTown ?? ''}
              onChange={(e) => update('villageTown', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label-field">Promotion average (out of 20)</label>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            className="input-field"
            value={school.promotionAverage ?? 10}
            onChange={(e) => update('promotionAverage', Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-slate-400">
            Pupils reaching this average are pre-selected for promotion. The admin can still promote pupils below it.
          </p>
        </div>
        <div>
          <label className="label-field">Principal's name (signs report cards)</label>
          <input
            className="input-field"
            placeholder="e.g. Mr. Tambe"
            value={school.principalName ?? ''}
            onChange={(e) => update('principalName', e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">{t('setup.language')}</label>
          <select className="input-field" value={school.language} onChange={(e) => update('language', e.target.value as Language)}>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.save')}
          </button>
          {savedMsg && <span className="text-sm text-brand-600">Saved</span>}
        </div>
      </div>

      <div className="mt-6 max-w-2xl">
        <ChangePasswordCard />
      </div>
    </div>
  )
}

function ChangePasswordCard(): JSX.Element {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleChange(): Promise<void> {
    setSaving(true)
    const res = await window.api.auth.changeAdminPassword({ currentPassword: current, newPassword: next })
    setSaving(false)
    if (res.ok) {
      setMsg({ ok: true, text: 'Password updated.' })
      setCurrent('')
      setNext('')
    } else {
      setMsg({ ok: false, text: res.error ?? 'Failed.' })
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
        <KeyRound className="h-5 w-5 text-slate-400" />
        Change administrator password
      </h2>
      {msg && (
        <div className={'rounded-xl px-4 py-2.5 text-sm ' + (msg.ok ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700')}>
          {msg.text}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field">Current password</label>
          <input type="password" className="input-field" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label-field">New password</label>
          <input type="password" className="input-field" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
      </div>
      <button className="btn-secondary" onClick={handleChange} disabled={saving || !current || next.length < 4}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
    </div>
  )
}
