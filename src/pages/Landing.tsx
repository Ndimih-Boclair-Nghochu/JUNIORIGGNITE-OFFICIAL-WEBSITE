import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTypewriter } from '@/lib/useTypewriter'

/**
 * The website's front door: a calm, full-screen pure-green intro showing only
 * the mark and the platform name (typed on), then it moves the visitor into the
 * site automatically — no button to click.
 */
export default function Landing(): JSX.Element {
  const navigate = useNavigate()
  const { shown, done } = useTypewriter('JuniorIgnite', { speed: 110, startDelay: 450 })
  const [reveal, setReveal] = useState(false)

  // Reveal the tagline a beat after the name finishes, then glide into the site.
  useEffect(() => {
    if (!done) return
    const show = setTimeout(() => setReveal(true), 300)
    const go = setTimeout(() => navigate('/home'), 1600)
    return () => {
      clearTimeout(show)
      clearTimeout(go)
    }
  }, [done, navigate])

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-600 px-6 text-center text-white">
      {/* subtle depth on the pure green — never enough to break the flat look */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(6,55,31,0.55),transparent_55%)]" />

      <div className="relative flex flex-col items-center">
        {/* Logo on a soft white tile so the mark reads on green */}
        <div className="animate-fade-in relative mb-9">
          <span className="absolute inset-0 -z-10 rounded-[28px] bg-white/25 blur-2xl" />
          <div className="grid h-28 w-28 place-items-center rounded-[28px] bg-white shadow-2xl sm:h-32 sm:w-32">
            <img src="/logo.png" alt="JuniorIgnite" className="h-20 w-20 sm:h-24 sm:w-24" draggable={false} />
          </div>
        </div>

        {/* Typed platform name */}
        <h1
          className={
            'font-display text-5xl font-extrabold tracking-tightest sm:text-6xl md:text-7xl ' + (done ? '' : 'caret')
          }
        >
          {shown}
        </h1>

        {/* Tagline — fades in after typing, just before the redirect */}
        <p
          className="mt-6 text-base font-medium tracking-wide text-brand-50/90 transition-all duration-700 sm:text-lg"
          style={{ opacity: reveal ? 1 : 0, transform: reveal ? 'translateY(0)' : 'translateY(12px)' }}
        >
          Igniting Young Minds
        </p>
      </div>

      <div
        className="absolute bottom-7 text-xs font-medium uppercase tracking-[0.25em] text-white/45 transition-opacity duration-700"
        style={{ opacity: reveal ? 1 : 0 }}
      >
        Offline School Management · Cameroon
      </div>
    </div>
  )
}
