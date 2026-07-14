import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogIn, Users, KeyRound, Loader2, ArrowRight, ChevronDown, ShieldCheck, WifiOff, MapPin } from 'lucide-react'
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

  const location = [school?.subdivision, school?.division, school?.region].filter(Boolean).join(', ')

  function scrollToClasses(): void {
    document.getElementById('classes')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-white via-brand-50/40 to-white">
      {/* Ambient animated orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-ji-orb-a absolute -left-32 -top-24 h-[26rem] w-[26rem] rounded-full bg-brand-300/40 blur-3xl" />
        <div className="animate-ji-orb-b absolute -right-28 top-24 h-[24rem] w-[24rem] rounded-full bg-accent-300/40 blur-3xl" />
        <div className="animate-ji-orb-a absolute bottom-[-8rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-brand-200/40 blur-3xl" />
      </div>

      {/* Top bar (floats over hero) */}
      <header className="animate-ji-fade-in relative z-20 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          {school?.logoPath ? (
            <img
              src={`file:///${school.logoPath.replace(/\\/g, '/')}`}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            <Logo className="h-10 w-10" />
          )}
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">{school?.name}</div>
            {school?.motto && <div className="text-xs italic text-slate-500">{school.motto}</div>}
          </div>
        </div>
        <button
          onClick={() => setShowLogin(true)}
          className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-brand-300 hover:text-brand-700"
        >
          <span className="hidden text-slate-400 group-hover:text-brand-500 sm:inline">
            {t('landing.haveAccount')}
          </span>
          <LogIn className="h-4 w-4" />
          {t('landing.login')}
        </button>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-4xl flex-col items-center justify-center px-6 pb-16 text-center">
        {/* Logo with glow */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="animate-ji-glow absolute h-40 w-40 rounded-full bg-gradient-to-tr from-brand-400 to-accent-400 blur-3xl" />
          <div className="animate-ji-float relative">
            <Logo className="animate-ji-pop h-32 w-32 drop-shadow-xl sm:h-36 sm:w-36" />
          </div>
        </div>

        {/* Wordmark */}
        <h1
          className="animate-ji-fade-up text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl"
          style={{ animationDelay: '120ms' }}
        >
          Junior<span className="ji-shimmer-text">Ignite</span>
        </h1>

        {/* Tagline */}
        <p
          className="animate-ji-fade-up mt-4 text-2xl font-semibold text-brand-700 sm:text-3xl"
          style={{ animationDelay: '240ms' }}
        >
          {t('landing.tagline')}
        </p>

        {/* Subtitle */}
        <p
          className="animate-ji-fade-up mt-4 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg"
          style={{ animationDelay: '360ms' }}
        >
          {t('landing.subtitle')}
        </p>

        {/* CTAs */}
        <div
          className="animate-ji-fade-up mt-9 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: '480ms' }}
        >
          <button
            onClick={() => setShowLogin(true)}
            className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30"
          >
            <LogIn className="h-5 w-5" />
            {t('landing.haveAccount')} {t('landing.login')}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </button>
          <button
            onClick={scrollToClasses}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-7 py-3.5 text-base font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-brand-300"
          >
            <Users className="h-5 w-5" />
            {t('landing.browseClasses')}
          </button>
        </div>

        {/* Trust badges */}
        <div
          className="animate-ji-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500"
          style={{ animationDelay: '600ms' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <WifiOff className="h-4 w-4 text-brand-500" />
            {t('landing.offlineBadge')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            {t('landing.secureBadge')}
          </span>
          {location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-accent-500" />
              {location}
            </span>
          )}
        </div>

        {/* Scroll indicator */}
        <button
          onClick={scrollToClasses}
          className="animate-ji-fade-in absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 hover:text-brand-600"
          style={{ animationDelay: '900ms' }}
          aria-label={t('landing.scrollHint')}
        >
          <ChevronDown className="animate-ji-bounce-down h-7 w-7" />
        </button>
      </section>

      {/* Classes */}
      <main id="classes" className="relative z-10 mx-auto max-w-6xl scroll-mt-6 px-6 pb-20 sm:px-10">
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

        <p className="mt-12 text-center text-xs text-slate-400">
          Junior<span className="font-semibold text-brand-600">Ignite</span> · {t('landing.offlineBadge')}
        </p>
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
