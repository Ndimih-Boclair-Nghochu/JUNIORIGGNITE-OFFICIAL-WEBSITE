import { useTranslation } from 'react-i18next'
import { ArrowRight, LogIn, ShieldCheck, WifiOff } from 'lucide-react'
import { Logo } from '../../components/Logo'

/**
 * JuniorIgnite-branded welcome shown on every app launch, before the user
 * enters their school account. Pure product branding — no school info, no
 * login, no class cards. A single call-to-action proceeds into the account
 * (or into account creation when no school exists yet).
 */
export default function WelcomeLanding({
  hasAccount,
  onEnter
}: {
  hasAccount: boolean
  onEnter: () => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-brand-50/40 to-white">
      {/* Ambient animated orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-ji-orb-a absolute -left-32 -top-24 h-[26rem] w-[26rem] rounded-full bg-brand-300/40 blur-3xl" />
        <div className="animate-ji-orb-b absolute -right-28 top-24 h-[24rem] w-[24rem] rounded-full bg-accent-300/40 blur-3xl" />
        <div className="animate-ji-orb-a absolute bottom-[-8rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-brand-200/40 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
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

        {/* Primary CTA */}
        <div className="animate-ji-fade-up mt-9" style={{ animationDelay: '480ms' }}>
          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30"
          >
            {hasAccount ? <ArrowRight className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            {hasAccount ? t('landing.continue') : t('landing.createAccount')}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
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
        </div>
      </section>
    </div>
  )
}
