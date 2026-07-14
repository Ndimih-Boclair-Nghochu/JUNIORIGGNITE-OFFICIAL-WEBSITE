import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, WifiOff, Sparkles } from 'lucide-react'
import { Logo } from '../../components/Logo'

const DURATION = 3000 // ms — splash fills, then auto-redirects into the account

/**
 * JuniorIgnite-branded welcome shown on every launch. A progress bar fills over
 * ~5 seconds and then automatically forwards the user into their account — no
 * click required. Pure product branding: no school info, no login, no cards.
 */
export default function WelcomeLanding({
  hasAccount,
  onEnter
}: {
  hasAccount: boolean
  onEnter: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const enteredRef = useRef(false)

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / DURATION)
      setProgress(p)
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else if (!enteredRef.current) {
        enteredRef.current = true
        onEnter()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pct = Math.round(progress * 100)

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-brand-50/50 to-white">
      {/* Ambient animated orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-ji-orb-a absolute -left-40 -top-32 h-[30rem] w-[30rem] rounded-full bg-brand-300/40 blur-3xl" />
        <div className="animate-ji-orb-b absolute -right-36 top-20 h-[28rem] w-[28rem] rounded-full bg-accent-300/35 blur-3xl" />
        <div className="animate-ji-orb-a absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-brand-200/40 blur-3xl" />
      </div>
      {/* Soft center spotlight + bottom fade for depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_35%,rgba(255,255,255,0.7),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        {/* Logo with layered glow + rotating gradient ring */}
        <div className="relative mb-9 flex h-48 w-48 items-center justify-center">
          <div className="animate-ji-glow absolute h-40 w-40 rounded-full bg-gradient-to-tr from-brand-400 to-accent-400 blur-3xl" />
          <div
            className="animate-ji-rotate absolute h-48 w-48 rounded-full opacity-80"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(34,165,106,0), rgba(34,165,106,0.55), rgba(248,133,10,0.55), rgba(34,165,106,0))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))'
            }}
          />
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
          className="animate-ji-fade-up mt-4 flex items-center gap-2 text-2xl font-semibold text-brand-700 sm:text-3xl"
          style={{ animationDelay: '220ms' }}
        >
          <Sparkles className="h-6 w-6 text-accent-500" />
          {t('landing.tagline')}
        </p>

        {/* Auto-loading bar */}
        <div
          className="animate-ji-fade-up mt-12 w-72 max-w-full sm:w-96"
          style={{ animationDelay: '440ms' }}
        >
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-500">{t('landing.preparing')}</span>
            <span className="font-bold tabular-nums text-brand-600">{pct}%</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-500 to-accent-500 shadow-[0_0_16px_rgba(34,165,106,0.55)]"
              style={{ width: `${pct}%`, transition: 'width 80ms linear' }}
            >
              <div className="absolute inset-0 animate-ji-bar-sheen bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div
          className="animate-ji-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500"
          style={{ animationDelay: '560ms' }}
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

      {/* Footer wordmark */}
      <div className="absolute inset-x-0 bottom-6 z-10 text-center text-xs font-medium text-slate-400">
        Junior<span className="font-semibold text-brand-600">Ignite</span>
        {!hasAccount && <span className="ml-1 text-slate-300">· {t('landing.createAccount')}</span>}
      </div>
    </div>
  )
}
