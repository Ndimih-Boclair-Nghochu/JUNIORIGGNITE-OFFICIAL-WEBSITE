import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTypewriter } from '@/lib/useTypewriter'

/**
 * The website's front door: a calm, full-screen pure-green landing that shows
 * only the mark and the platform name (typed on), then invites the visitor in.
 * Deliberately minimal — no marketing copy competing for attention.
 */
export default function Landing(): JSX.Element {
  const { shown, done } = useTypewriter('JuniorIgnite', { speed: 115, startDelay: 500 })
  const [enter, setEnter] = useState(false)

  // Reveal the tagline + button a beat after the name finishes.
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setEnter(true), 350)
      return () => clearTimeout(t)
    }
  }, [done])

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
            'font-display text-5xl font-extrabold tracking-tightest sm:text-6xl md:text-7xl ' +
            (done ? '' : 'caret')
          }
        >
          {shown}
        </h1>

        {/* Minimal follow-on — fades in only after typing completes */}
        <div
          className="mt-6 flex flex-col items-center gap-8 transition-all duration-700"
          style={{ opacity: enter ? 1 : 0, transform: enter ? 'translateY(0)' : 'translateY(16px)' }}
        >
          <p className="text-base font-medium tracking-wide text-brand-50/90 sm:text-lg">Igniting Young Minds</p>
          <Link
            to="/home"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-[0.95rem] font-semibold text-brand-700 shadow-2xl transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            Enter
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div
        className="absolute bottom-7 text-xs font-medium uppercase tracking-[0.25em] text-white/45 transition-opacity duration-700"
        style={{ opacity: enter ? 1 : 0 }}
      >
        Offline School Management · Cameroon
      </div>
    </div>
  )
}
