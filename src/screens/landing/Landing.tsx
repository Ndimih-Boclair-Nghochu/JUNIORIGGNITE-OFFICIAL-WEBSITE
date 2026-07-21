import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogIn, Users, KeyRound, MapPin, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { SchoolBadge } from '../../components/SchoolBadge'
import { Modal } from '../../components/Modal'
import { EmptyState } from '../../components/EmptyState'
import { ForgotPasswordModal } from '../../components/ForgotPasswordModal'
import type { SchoolClass } from '@shared/types'

/**
 * The school's own home screen (inside the account, after the JuniorIgnite
 * welcome). Branded entirely with the school's identity — its logo, name and
 * motto — never the JuniorIgnite product logo. Teachers open a class with its
 * PIN; the administrator signs in to the dashboard.
 */
export default function Landing(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const school = useAppStore((s) => s.school)
  const session = useAuthStore((s) => s.session)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [accessClass, setAccessClass] = useState<SchoolClass | null>(null)

  // Already-authenticated users skip the school home and go straight to their area.
  useEffect(() => {
    if (session?.role === 'admin') navigate('/admin', { replace: true })
    else if (session?.role === 'teacher') navigate('/teacher', { replace: true })
  }, [session, navigate])

  async function loadClasses(): Promise<void> {
    setLoadingClasses(true)
    const res = await window.api.landing.listClasses()
    if (res.ok) setClasses(res.data ?? [])
    setLoadingClasses(false)
  }

  useEffect(() => {
    loadClasses()
  }, [])

  const location = [school?.subdivision, school?.division, school?.region].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* School-branded header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <SchoolBadge school={school} className="h-14 w-14 text-xl" />
            <div className="leading-tight">
              <h1 className="text-xl font-bold text-slate-900">{school?.name}</h1>
              {school?.motto && <p className="text-sm italic text-slate-500">{school.motto}</p>}
              {location && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {location}
                </p>
              )}
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowLogin(true)}>
            <LogIn className="h-4 w-4" />
            {t('landing.adminLogin')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-slate-900">{t('landing.yourClasses')}</h2>
          {!loadingClasses && classes.length > 0 && (
            <span className="text-sm text-slate-400">
              {classes.length} {t('common.classes').toLowerCase()}
            </span>
          )}
        </div>

        {loadingClasses ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-40 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState icon={Users} title={t('landing.noClasses')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c, i) => (
              <div
                key={c.id}
                className="animate-ji-fade-up card flex flex-col gap-3 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-md"
                style={{ animationDelay: `${i * 70}ms` }}
              >
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
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Users className="h-5 w-5" />
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
  const [showForgot, setShowForgot] = useState(false)

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

  if (showForgot) return <ForgotPasswordModal onClose={() => setShowForgot(false)} />

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
        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="w-full text-center text-sm font-medium text-slate-500 hover:text-brand-600"
        >
          {t('auth.forgotPassword')}
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
