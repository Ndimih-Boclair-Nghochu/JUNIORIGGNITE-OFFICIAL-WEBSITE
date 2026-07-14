import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, CheckCircle2, Loader2, LogIn } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import i18n from '../../i18n'
import type { Language } from '@shared/types'

type Step = 'school' | 'admin' | 'review' | 'done'

interface FormState {
  name: string
  motto: string
  logoPath: string | null
  address: string
  phone: string
  email: string
  region: string
  division: string
  subdivision: string
  language: Language
  adminUsername: string
  adminPassword: string
  adminPasswordConfirm: string
}

const initialForm: FormState = {
  name: '',
  motto: '',
  logoPath: null,
  address: '',
  phone: '',
  email: '',
  region: '',
  division: '',
  subdivision: '',
  language: 'en',
  adminUsername: '',
  adminPassword: '',
  adminPasswordConfirm: ''
}

export default function SetupWizard(): JSX.Element {
  const { t } = useTranslation()
  const refreshApp = useAppStore((s) => s.refresh)
  const adminLogin = useAuthStore((s) => s.adminLogin)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [step, setStep] = useState<Step>('school')
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [classCodes, setClassCodes] = useState<Record<string, string>>({})
  // "Already have an account?" login state
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginSubmitting, setLoginSubmitting] = useState(false)

  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoginSubmitting(true)
    setLoginError(null)
    const res = await adminLogin(loginUsername, loginPassword)
    setLoginSubmitting(false)
    if (!res.ok) {
      setLoginError(t('auth.invalidCredentials'))
      return
    }
    // Session is now active; refreshing the app store routes into the account.
    await refreshApp()
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handlePickLogo(): Promise<void> {
    const res = await window.api.files.pickImage()
    if (res.ok && res.data?.path) update('logoPath', res.data.path)
  }

  function validateSchoolStep(): boolean {
    if (!form.name.trim()) {
      setError(t('setup.schoolName') + ': ' + t('common.required'))
      return false
    }
    setError(null)
    return true
  }

  function validateAdminStep(): boolean {
    if (!form.adminUsername.trim() || form.adminPassword.length < 4) {
      setError(t('common.required'))
      return false
    }
    if (form.adminPassword !== form.adminPasswordConfirm) {
      setError(t('setup.passwordMismatch'))
      return false
    }
    setError(null)
    return true
  }

  async function handleFinish(): Promise<void> {
    setSubmitting(true)
    setError(null)
    const res = await window.api.app.firstRunSetup({
      name: form.name,
      motto: form.motto,
      address: form.address,
      phone: form.phone,
      email: form.email,
      region: form.region,
      division: form.division,
      subdivision: form.subdivision,
      language: form.language,
      logoPath: form.logoPath,
      adminUsername: form.adminUsername,
      adminPassword: form.adminPassword
    })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Setup failed.')
      return
    }
    setClassCodes(res.data?.classCodes ?? {})
    setStep('done')
  }

  async function handleGoToApp(): Promise<void> {
    await refreshApp()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-2 h-16 w-16" />
          <div className="mb-1 text-lg font-extrabold tracking-tight text-slate-900">
            Junior<span className="text-brand-600">Ignite</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'login' ? t('setup.loginTitle') : t('setup.title')}
          </h1>
          <p className="mt-1 text-slate-500">
            {mode === 'login' ? t('setup.loginSubtitle') : t('setup.subtitle')}
          </p>
        </div>

        {mode === 'login' ? (
          <div className="card">
            {loginError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{loginError}</div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label-field">{t('auth.username')}</label>
                <input
                  className="input-field"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label-field">{t('auth.password')}</label>
                <input
                  type="password"
                  className="input-field"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loginSubmitting}>
                {loginSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {t('auth.signIn')}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setLoginError(null)
              }}
              className="mt-4 w-full text-center text-sm text-slate-500 hover:text-brand-600"
            >
              {t('setup.createNew')}
            </button>
          </div>
        ) : (
          <>
          <div className="card">
          {step !== 'done' && (
            <div className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-400">
              {(['school', 'admin', 'review'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs ' +
                      (step === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')
                    }
                  >
                    {i + 1}
                  </span>
                  <span className={step === s ? 'text-slate-800' : ''}>
                    {t(`setup.step${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
                  </span>
                  {i < 2 && <span className="mx-1 h-px w-6 bg-slate-200" />}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {step === 'school' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                  {form.logoPath ? (
                    <img src={`file:///${form.logoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-7 w-7 text-slate-300" />
                  )}
                </div>
                <button type="button" className="btn-secondary" onClick={handlePickLogo}>
                  {t('setup.uploadLogo')}
                </button>
              </div>

              <div>
                <label className="label-field">{t('setup.schoolName')}</label>
                <input className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div>
                <label className="label-field">
                  {t('setup.motto')} ({t('common.optional')})
                </label>
                <input className="input-field" value={form.motto} onChange={(e) => update('motto', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">{t('setup.phone')}</label>
                  <input className="input-field" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
                <div>
                  <label className="label-field">{t('setup.email')}</label>
                  <input className="input-field" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-field">{t('setup.address')}</label>
                <input className="input-field" value={form.address} onChange={(e) => update('address', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-field">{t('setup.region')}</label>
                  <input className="input-field" value={form.region} onChange={(e) => update('region', e.target.value)} />
                </div>
                <div>
                  <label className="label-field">{t('setup.division')}</label>
                  <input
                    className="input-field"
                    value={form.division}
                    onChange={(e) => update('division', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-field">{t('setup.subdivision')}</label>
                  <input
                    className="input-field"
                    value={form.subdivision}
                    onChange={(e) => update('subdivision', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label-field">{t('setup.language')}</label>
                <select
                  className="input-field"
                  value={form.language}
                  onChange={(e) => {
                    update('language', e.target.value as Language)
                    i18n.changeLanguage(e.target.value)
                  }}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  className="btn-primary"
                  onClick={() => validateSchoolStep() && setStep('admin')}
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}

          {step === 'admin' && (
            <div className="space-y-4">
              <div>
                <label className="label-field">{t('setup.adminUsername')}</label>
                <input
                  className="input-field"
                  value={form.adminUsername}
                  onChange={(e) => update('adminUsername', e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">{t('setup.adminPassword')}</label>
                <input
                  type="password"
                  className="input-field"
                  value={form.adminPassword}
                  onChange={(e) => update('adminPassword', e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">{t('setup.adminPasswordConfirm')}</label>
                <input
                  type="password"
                  className="input-field"
                  value={form.adminPasswordConfirm}
                  onChange={(e) => update('adminPasswordConfirm', e.target.value)}
                />
              </div>
              <div className="flex justify-between pt-2">
                <button className="btn-secondary" onClick={() => setStep('school')}>
                  {t('common.back')}
                </button>
                <button className="btn-primary" onClick={() => validateAdminStep() && setStep('review')}>
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">{t('setup.schoolName')}</dt>
                  <dd className="font-medium text-slate-800">{form.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t('setup.language')}</dt>
                  <dd className="font-medium text-slate-800">{form.language === 'en' ? 'English' : 'Français'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t('setup.adminUsername')}</dt>
                  <dd className="font-medium text-slate-800">{form.adminUsername}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t('setup.address')}</dt>
                  <dd className="font-medium text-slate-800">{form.address || '—'}</dd>
                </div>
              </dl>
              <div className="flex justify-between pt-2">
                <button className="btn-secondary" onClick={() => setStep('admin')} disabled={submitting}>
                  {t('common.back')}
                </button>
                <button className="btn-primary" onClick={handleFinish} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('common.finish')}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-brand-500" />
              <h2 className="text-xl font-semibold text-slate-900">{t('setup.doneTitle')}</h2>
              <p className="text-slate-500">{t('setup.doneBody')}</p>
              {Object.keys(classCodes).length > 0 && (
                <div className="mx-auto max-w-sm space-y-2 rounded-xl bg-slate-50 p-4 text-left">
                  {Object.entries(classCodes).map(([cls, code]) => (
                    <div key={cls} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{cls}</span>
                      <span className="rounded-lg bg-white px-3 py-1 font-mono text-brand-700 shadow-sm">{code}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn-primary mx-auto" onClick={handleGoToApp}>
                {t('setup.goToApp')}
              </button>
            </div>
          )}
          </div>
          {step !== 'done' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="mt-5 w-full text-center text-sm text-slate-500 hover:text-brand-600"
            >
              {t('setup.haveAccount')}{' '}
              <span className="font-semibold text-brand-600">{t('setup.logIn')}</span>
            </button>
          )}
          </>
        )}
      </div>
    </div>
  )
}
