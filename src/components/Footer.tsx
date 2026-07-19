import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Youtube, Facebook } from 'lucide-react'
import { Logo } from './Logo'
import { SITE } from '@/lib/config'
import { useSiteSettings } from '@/lib/useSiteSettings'
import { useT } from '@/lib/i18n'

export function Footer(): JSX.Element {
  const site = useSiteSettings()
  const { t } = useT()

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">{SITE.description}</p>
          <div className="mt-4 flex gap-3">
            {site.youtube && (
              <a
                href={site.youtube}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition hover:border-brand-300 hover:text-brand-600"
              >
                <Youtube className="h-4 w-4" />
              </a>
            )}
            {site.facebook && (
              <a
                href={site.facebook}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition hover:border-brand-300 hover:text-brand-600"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-ink">{t('footer.explore')}</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
            <li><Link to="/" className="hover:text-brand-700">{t('nav.home')}</Link></li>
            <li><Link to="/about" className="hover:text-brand-700">{t('nav.about')}</Link></li>
            <li><Link to="/contact" className="hover:text-brand-700">{t('nav.contact')}</Link></li>
            <li><Link to="/#download" className="hover:text-brand-700">{t('nav.download')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-ink">{t('footer.contact')}</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-brand-500" />
              <a href={`mailto:${site.email}`} className="hover:text-brand-700">{site.email}</a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-brand-500" />
              <span>{site.phone}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-brand-500" />
              <span>{site.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-muted sm:flex-row">
          <span>
            {/*
              The © symbol is the founder's private way in. It is deliberately
              unlabelled and absent from every menu, so only someone who knows
              to click it can reach the console.
            */}
            <Link
              to="/founder"
              aria-label="JuniorIgnite"
              title="JuniorIgnite"
              className="cursor-default text-ink-muted no-underline transition hover:text-ink-muted"
            >
              ©
            </Link>{' '}
            {new Date().getFullYear()} JuniorIgnite. {t('footer.rights')}
          </span>

          <a
            href={site.eligniteUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="font-bold uppercase tracking-wider text-ink transition hover:text-brand-700"
          >
            {t('footer.poweredBy')}
          </a>
        </div>
      </div>
    </footer>
  )
}
