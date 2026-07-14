import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogIn, Users, KeyRound, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { Logo } from '../../components/Logo'
import { Modal } from '../../components/Modal'
import { EmptyState } from '../../components/EmptyState'
import type { SchoolClass } from '@shared/types'

export default function Landing(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const school = useAppStore((s) => s.school)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [accessClass, setAccessClass] = useState<SchoolClass | null>(null)

  async function loadClasses(): Promise<void> {
    setLoadingClasses(true)
    const res = await window.api.landing.listClasses()
    if (res.ok) setClasses(res.data ?? [])
    setLoadingClasses(false)
  }

  useEffect(() => {
    loadClasses()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
        <div className="flex items-center gap-3">
          {school?.logoPath ? (
            <img
              src={`file:///${school.logoPath.replace(/\\/g, '/')}`}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <Logo className="h-12 w-12" />
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-900">{school?.name}</h1>
            {school?.motto && <p className="text-sm italic text-slate-500">{school.motto}</p>}
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowLogin(true)}>
          <LogIn className="h-4 w-4" />
          {t('landing.adminLogin')}
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-10">
        <h2 className="mb-6 text-xl font-semibold text-slate-800">{t('common.classes')}</h2>

        {loadingClasses ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : classes.length === 0 ? (
          <EmptyState icon={Users} title={t('landing.noClasses')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <div key={c.id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{c.name}</h3>
                    <span
                      className={
                        'mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        (c.subsystem === 'anglophone' ? 'bg-brand-50 text-brand-700' : 'bg-accent-50 text-accent-700')
                      }
                    >
                      {c.subsystem === 'anglophone' ? 'Anglophone' : 'Francophone'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  <div>{c.classTeacherName ?? '—'}</div>
                  <div>
                    {c.studentCount} / {c.capacity} {t('common.students').toLowerCase()}
                  </div>
                </div>
                <button className="btn-secondary mt-1" onClick={() => setAccessClass(c)}>
                  <KeyRound className="h-4 w-4" />
                  {t('landing.openClass')}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
      {accessClass && (
        <ClassAccessModal
          schoolClass={accessClass}
          onClose={() => setAccessClass(null)}
          onSuccess={() => navigate('/teacher')}
        />
      )}
    </div>
  )
}

function AdminLoginModal({ onClose }: { onClose: () => void }): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adminLogin = useAuthStore((s) => s.adminLogin)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await adminLogin(username, password)
    setSubmitting(false)
    if (!res.ok) {
      setError(t('auth.invalidCredentials'))
      return
    }
    navigate('/admin')
  }

  return (
    <Modal title={t('landing.adminLogin')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label-field">{t('auth.username')}</label>
          <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label-field">{t('auth.password')}</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('auth.signIn')}
        </button>
      </form>
    </Modal>
  )
}

function ClassAccessModal({
  schoolClass,
  onClose,
  onSuccess
}: {
  schoolClass: SchoolClass
  onClose: () => void
  onSuccess: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const unlockClass = useAuthStore((s) => s.unlockClass)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await unlockClass(schoolClass.id, code)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Incorrect code.')
      return
    }
    onSuccess()
  }

  return (
    <Modal title={`${schoolClass.name} — ${t('landing.enterCode')}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label-field">{t('landing.accessCode')}</label>
          <input
            className="input-field text-center font-mono text-lg tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('landing.openClass')}
        </button>
      </form>
    </Modal>
  )
}
