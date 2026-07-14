import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Download, Menu, X } from 'lucide-react'
import { Logo } from './Logo'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' }
]

export function Navbar(): JSX.Element {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={
        'fixed inset-x-0 top-0 z-50 transition ' +
        (scrolled ? 'border-b border-slate-200 bg-white/90 backdrop-blur shadow-sm' : 'bg-transparent')
      }
    >
      <nav className="container-page flex h-16 items-center justify-between">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                'rounded-full px-4 py-2 text-sm font-semibold transition ' +
                (isActive ? 'text-brand-700' : 'text-ink-soft hover:text-brand-700')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/founder" className="text-sm font-semibold text-ink-muted hover:text-brand-700">
            Founder
          </Link>
          <Link to="/#download" className="btn-primary !py-2.5 text-sm">
            <Download className="h-4 w-4" />
            Download
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-ink-soft md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  'rounded-xl px-4 py-3 text-base font-semibold ' +
                  (isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-slate-50')
                }
              >
                {l.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setOpen(false)
                navigate('/founder')
              }}
              className="rounded-xl px-4 py-3 text-left text-base font-semibold text-ink-soft hover:bg-slate-50"
            >
              Founder login
            </button>
            <Link to="/#download" onClick={() => setOpen(false)} className="btn-primary mt-1">
              <Download className="h-4 w-4" />
              Download the app
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
