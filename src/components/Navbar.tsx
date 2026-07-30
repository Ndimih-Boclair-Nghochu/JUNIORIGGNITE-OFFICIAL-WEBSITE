import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Download, Menu, X, Languages } from 'lucide-react'
import { Logo } from './Logo'
import { useT, type Lang } from '@/lib/i18n'

export function Navbar(): JSX.Element {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { t, lang, setLang } = useT()

  // The founder console is deliberately NOT linked here — it is reached only
  // through the © symbol in the footer.
  const links = [
    { to: '/home', label: t('nav.home') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') }
  ]

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleLang = (): void => setLang(lang === 'en' ? ('fr' as Lang) : ('en' as Lang))

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
          {links.map((l) => (
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
          <button
            onClick={toggleLang}
            aria-label={lang === 'en' ? 'Passer en français' : 'Switch to English'}
            title={lang === 'en' ? 'Passer en français' : 'Switch to English'}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
          >
            <Languages className="h-4 w-4" />
            {/* Shows the language you would switch TO. */}
            {lang === 'en' ? 'FR' : 'EN'}
          </button>
          <Link to="/download" className="btn-primary !py-2.5 text-sm">
            <Download className="h-4 w-4" />
            {t('nav.download')}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleLang}
            aria-label={lang === 'en' ? 'Passer en français' : 'Switch to English'}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-ink-soft"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === 'en' ? 'FR' : 'EN'}
          </button>
          <button className="rounded-lg p-2 text-ink-soft" onClick={() => setOpen((v) => !v)} aria-label={t('nav.menu')}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {links.map((l) => (
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
            <Link to="/download" onClick={() => setOpen(false)} className="btn-primary mt-1">
              <Download className="h-4 w-4" />
              {t('nav.downloadApp')}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
