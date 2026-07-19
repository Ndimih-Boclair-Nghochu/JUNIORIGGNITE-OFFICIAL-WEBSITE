import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  ClipboardCheck,
  NotebookPen,
  IdCard,
  Wallet,
  Languages,
  WifiOff,
  ShieldCheck,
  DatabaseBackup,
  Download,
  FileText,
  School,
  PlayCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { DownloadButton } from '@/components/DownloadButton'
import { SectionHeader } from '@/components/SectionHeader'
import { Reveal } from '@/components/Reveal'
import { api } from '@/lib/api'
import { SITE } from '@/lib/config'
import { useT } from '@/lib/i18n'
import type { PublicStats } from '@/lib/types'

const FEATURES = [
  { icon: Users, title: 'Student Records', desc: 'Full enrolment with photos, guardians, medical notes, promotion, transfer & graduation history.' },
  { icon: ClipboardCheck, title: 'Daily Attendance', desc: 'Mark present, absent, sick or late per class with automatic attendance percentages.' },
  { icon: NotebookPen, title: 'Marks & Report Cards', desc: 'Enter CA & exam marks; auto-computed averages, positions, ranks and printable report cards.' },
  { icon: IdCard, title: 'Student ID Cards', desc: 'Generate laminated-paper or PVC ID cards with photo and a scannable QR code.' },
  { icon: Wallet, title: 'Fees & Receipts', desc: 'Track fees and MTN / Orange Money payments with instant printable receipts and balances.' },
  { icon: Languages, title: 'Bilingual', desc: 'Full English & French interface, with Anglophone and Francophone report-card subsystems.' },
  { icon: WifiOff, title: '100% Offline', desc: 'Every core workflow runs with no internet — built for real Cameroonian school conditions.' },
  { icon: ShieldCheck, title: 'Secure by Design', desc: 'Encrypted local database, hashed passwords, class PINs, and a full activity log.' },
  { icon: DatabaseBackup, title: 'Backup & Restore', desc: 'One-click local backups and restore, plus optional cloud sync when you are online.' }
]

const STEPS = [
  { icon: Download, title: 'Download the app', desc: 'Get the Windows installer straight from this page — no account needed to download.' },
  { icon: FileText, title: 'Install with the guide', desc: 'Follow the included step-by-step setup guide (and video) to install in minutes.' },
  { icon: School, title: 'Create your school account', desc: 'Run the first-time wizard: add your school details, logo and administrator.' },
  { icon: CheckCircle2, title: 'Start managing — offline', desc: 'Register students, take attendance, enter marks and print report cards right away.' }
]

export default function Home(): JSX.Element {
  const { t } = useT()
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    api.publicStats().then(setStats).catch(() => {})
  }, [])

  const fmt = (n: number): string => n.toLocaleString('en-US')

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-orb-a absolute -left-40 -top-32 h-[32rem] w-[32rem] rounded-full bg-brand-300/40 blur-3xl" />
          <div className="animate-orb-b absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-accent-300/30 blur-3xl" />
        </div>

        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <Reveal>
            <span className="eyebrow">
              <Sparkles className="h-4 w-4 text-accent-500" />
              {t('hero.eyebrow')}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {t('hero.title1')}{' '}
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                {t('hero.title2')}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
              {SITE.name} is the complete desktop system for nursery &amp; primary schools — students,
              attendance, marks, report cards, ID cards and fees, all running fully offline on your computer.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DownloadButton className="btn-primary text-base" size={`${SITE.installerSizeMb} MB`} />
              <a href="#video" className="btn-ghost text-base">
                <PlayCircle className="h-5 w-5" />
                {t('hero.watchGuide')}
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><WifiOff className="h-4 w-4 text-brand-500" /> {t('hero.worksOffline')}</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-500" /> {t('hero.windows')}</span>
              <span className="inline-flex items-center gap-1.5"><Languages className="h-4 w-4 text-brand-500" /> {t('hero.bilingual')}</span>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <AppWindowMock />
          </Reveal>
        </div>

        {/* Stats bar */}
        <div className="container-page relative pb-16">
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur sm:grid-cols-4">
            <Stat value={stats ? fmt(stats.downloads) + '+' : '—'} label={t('stats.downloads')} />
            <Stat value={stats ? fmt(stats.schools) : '—'} label={t('stats.schools')} />
            <Stat value={stats ? fmt(stats.students) + '+' : '—'} label={t('stats.students')} />
            <Stat value="100%" label={t('stats.offline')} />
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="bg-slate-50 py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow={t('features.eyebrow')}
            title={t('features.title')}
            subtitle="One installation covers the entire school office — no monthly fees, no internet dependency, no data leaving your computer."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow={t('steps.eyebrow')}
            title={t('steps.title')}
            subtitle="No servers to configure, no technical skills required. Download, install with the guide, and you are running."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="absolute right-5 top-5 text-4xl font-black text-slate-100">{i + 1}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 flex justify-center">
            <a href="/JuniorIgnite-Setup-Guide.pdf" download className="btn-ghost">
              <FileText className="h-5 w-5" />
              Download the setup guide (PDF)
            </a>
          </Reveal>
        </div>
      </section>

      {/* ---------------- VIDEO GUIDE ---------------- */}
      <section id="video" className="bg-slate-50 py-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow"><PlayCircle className="h-4 w-4 text-accent-500" /> Watch &amp; learn</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              See {SITE.name} set up from scratch
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              Our step-by-step video walks through downloading, installing and creating your school
              account — the same guide that ships with the app. Watch it right here, or on YouTube.
            </p>
            <ul className="mt-6 space-y-3">
              {['Installing on Windows in minutes', 'Creating your school & administrator', 'Adding classes, teachers and students', 'Printing your first report card'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-ink-soft">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />
                  {t}
                </li>
              ))}
            </ul>
            <a href={SITE.social.youtube} target="_blank" rel="noreferrer" className="btn-ghost mt-8">
              <PlayCircle className="h-5 w-5" />
              Open on YouTube
            </a>
          </Reveal>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-xl">
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${SITE.youtubeId}`}
                  title={`${SITE.name} setup guide`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- DOWNLOAD ---------------- */}
      <section id="download" className="py-20">
        <div className="container-page">
          <Reveal>
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-700 p-8 text-white shadow-2xl sm:p-12">
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    <Download className="h-4 w-4" /> Free download
                  </span>
                  <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Download {SITE.name}</h2>
                  <p className="mt-3 max-w-md text-brand-50">
                    Version {SITE.version} · Windows 10 &amp; 11 · {SITE.installerSizeMb} MB. Install once and run
                    your whole school offline.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <DownloadButton className="btn bg-white text-brand-700 hover:-translate-y-0.5 hover:bg-brand-50" label="Download for Windows" />
                    <a href="/JuniorIgnite-Setup-Guide.pdf" download className="btn border border-white/40 text-white hover:bg-white/10">
                      <FileText className="h-5 w-5" /> Setup guide (PDF)
                    </a>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-brand-100">What you get</h4>
                  <ul className="mt-4 space-y-3 text-sm">
                    {['The full desktop application', 'Printable step-by-step setup guide', 'Video installation walkthrough', 'Demo data to explore instantly', 'Free lifetime local use'].map((t) => (
                      <li key={t} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-300" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA BANNER ---------------- */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="container-page flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <h3 className="text-2xl font-extrabold text-ink">Ready to bring your school office into one app?</h3>
            <p className="mt-2 text-ink-muted">Join schools across Cameroon already running {SITE.name} offline.</p>
          </div>
          <div className="flex gap-3">
            <DownloadButton className="btn-primary" label="Download now" />
            <Link to="/contact" className="btn-ghost">
              Talk to us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <div className="text-center">
      <div className="text-2xl font-extrabold text-brand-700 sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-muted sm:text-sm">{label}</div>
    </div>
  )
}

/**
 * A stylised illustration of the app window. Deliberately shows no figures —
 * it depicts the interface, it does not claim any real usage numbers.
 */
function AppWindowMock(): JSX.Element {
  const tiles = [
    { label: 'Students', value: '—', color: 'bg-brand-500' },
    { label: 'Teachers', value: '—', color: 'bg-accent-500' },
    { label: 'Classes', value: '—', color: 'bg-brand-400' },
    { label: 'Attendance', value: '—', color: 'bg-accent-400' }
  ]
  const bars = [45, 70, 55, 85, 60, 92, 74]
  return (
    <div className="animate-float rounded-2xl border border-slate-200 bg-white shadow-2xl">
      {/* title bar */}
      <div className="flex items-center gap-2 rounded-t-2xl border-b border-slate-100 bg-slate-50 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <div className="ml-3 flex items-center gap-2">
          <img src="/logo.png" className="h-4 w-4" alt="" />
          <span className="text-xs font-semibold text-ink-soft">JuniorIgnite — Dashboard</span>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className={`mb-2 h-1.5 w-8 rounded-full ${t.color}`} />
              <div className="text-lg font-extrabold text-ink">{t.value}</div>
              <div className="text-[11px] font-medium text-ink-muted">{t.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Enrolment this term</span>
            
          </div>
          <div className="flex h-24 items-end gap-2">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-brand-300" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
