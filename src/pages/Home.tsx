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
import { api, youtubeEmbedId } from '@/lib/api'
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
  // The guide video is set by the founder in the console; fall back to the
  // built-in default only if none has been configured.
  const [videoId, setVideoId] = useState<string>(SITE.youtubeId)

  useEffect(() => {
    api.publicStats().then(setStats).catch(() => {})
    api
      .siteSettings()
      .then((s) => {
        const id = youtubeEmbedId(s.videoUrl)
        if (id) setVideoId(id)
      })
      .catch(() => {})
  }, [])

  const fmt = (n: number): string => n.toLocaleString('en-US')

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/50 via-white to-white">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-orb-a absolute -left-40 -top-32 h-[34rem] w-[34rem] rounded-full bg-brand-300/35 blur-3xl" />
          <div className="animate-orb-b absolute -right-44 top-10 h-[30rem] w-[30rem] rounded-full bg-accent-300/25 blur-3xl" />
        </div>

        <div className="container-page relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <Reveal>
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5 text-accent-500" />
              {t('hero.eyebrow')}
            </span>
            <h1 className="mt-5 text-display-sm font-extrabold text-ink balance sm:text-display lg:text-display-lg">
              {t('hero.title1')} <span className="text-gradient">{t('hero.title2')}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              {SITE.name} is the complete desktop system for nursery &amp; primary schools — students,
              attendance, marks, report cards, ID cards and fees, all running fully offline on your computer.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <DownloadButton className="btn-primary text-base" size={`${SITE.installerSizeMb} MB`} />
              <a href="#video" className="btn-ghost text-base">
                <PlayCircle className="h-5 w-5" />
                {t('hero.watchGuide')}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><WifiOff className="h-4 w-4 text-brand-500" /> {t('hero.worksOffline')}</span>
              <span className="h-4 w-px bg-slate-200" />
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-500" /> {t('hero.windows')}</span>
              <span className="h-4 w-px bg-slate-200" />
              <span className="inline-flex items-center gap-1.5"><Languages className="h-4 w-4 text-brand-500" /> {t('hero.bilingual')}</span>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-brand-500/25 to-accent-400/20 blur-2xl" />
              <AppWindowMock />
            </div>
          </Reveal>
        </div>

        {/* Stats bar */}
        <div className="container-page relative pb-20">
          <div className="grid grid-cols-2 divide-x divide-slate-200/70 rounded-3xl border border-slate-200/80 bg-white/80 py-7 shadow-soft backdrop-blur sm:grid-cols-4">
            <Stat value={stats ? fmt(stats.downloads) + '+' : '—'} label={t('stats.downloads')} />
            <Stat value={stats ? fmt(stats.schools) : '—'} label={t('stats.schools')} />
            <Stat value={stats ? fmt(stats.students) + '+' : '—'} label={t('stats.students')} />
            <Stat value="100%" label={t('stats.offline')} />
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="border-y border-slate-100 bg-slate-50/70 py-24">
        <div className="container-page">
          <SectionHeader
            eyebrow={t('features.eyebrow')}
            title={t('features.title')}
            subtitle="One installation covers the entire school office — no monthly fees, no internet dependency, no data leaving your computer."
          />
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="group card-hover h-full">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-glow">
                    <f.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-ink">{f.title}</h3>
                  <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-muted">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="py-24">
        <div className="container-page">
          <SectionHeader
            eyebrow={t('steps.eyebrow')}
            title={t('steps.title')}
            subtitle="No servers to configure, no technical skills required. Download, install with the guide, and you are running."
          />
          <div className="relative mt-16 grid gap-6 md:grid-cols-4">
            {/* connecting line on desktop */}
            <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-11 hidden h-px bg-gradient-to-r from-brand-200 via-accent-200 to-brand-200 md:block" />
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div className="relative flex h-full flex-col items-center rounded-3xl border border-slate-200/80 bg-white p-7 text-center shadow-soft">
                  <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-soft ring-1 ring-slate-100">
                    <s.icon className="h-7 w-7" />
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 flex justify-center">
            <a href="/JuniorIgnite-Setup-Guide.pdf" download className="btn-ghost">
              <FileText className="h-5 w-5" />
              Download the setup guide (PDF)
            </a>
          </Reveal>
        </div>
      </section>

      {/* ---------------- VIDEO GUIDE ---------------- */}
      <section id="video" className="border-y border-slate-100 bg-slate-50/70 py-24">
        <div className="container-page grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow"><PlayCircle className="h-3.5 w-3.5 text-accent-500" /> Watch &amp; learn</span>
            <h2 className="mt-5 text-display-sm font-extrabold text-ink balance sm:text-4xl">
              See {SITE.name} set up from scratch
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              Our step-by-step video walks through downloading, installing and creating your school
              account — the same guide that ships with the app. Watch it right here, or on YouTube.
            </p>
            <ul className="mt-7 space-y-3.5">
              {['Installing on Windows in minutes', 'Creating your school & administrator', 'Adding classes, teachers and students', 'Printing your first report card'].map((item) => (
                <li key={item} className="flex items-center gap-3 font-medium text-ink-soft">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a href={SITE.social.youtube} target="_blank" rel="noreferrer" className="btn-ghost mt-9">
              <PlayCircle className="h-5 w-5" />
              Open on YouTube
            </a>
          </Reveal>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lift">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
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
      <section id="download" className="py-24">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-9 text-white shadow-glow sm:p-14">
              <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl" />
              <div className="relative grid items-center gap-10 lg:grid-cols-2">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ring-1 ring-white/20">
                    <Download className="h-4 w-4" /> Free download
                  </span>
                  <h2 className="mt-5 text-display-sm font-extrabold sm:text-4xl">Download {SITE.name}</h2>
                  <p className="mt-4 max-w-md text-brand-50">
                    Version {SITE.version} · Windows 10 &amp; 11 · {SITE.installerSizeMb} MB. Install once and run
                    your whole school offline.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <DownloadButton className="btn-light" label="Download for Windows" />
                    <a href="/JuniorIgnite-Setup-Guide.pdf" download className="btn border border-white/30 text-white hover:bg-white/10">
                      <FileText className="h-5 w-5" /> Setup guide (PDF)
                    </a>
                  </div>
                </div>
                <div className="rounded-3xl bg-white/10 p-7 ring-1 ring-white/15 backdrop-blur">
                  <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-brand-100">What you get</h4>
                  <ul className="mt-5 space-y-3.5 text-[0.95rem]">
                    {['The full desktop application', 'Printable step-by-step setup guide', 'Video installation walkthrough', 'Guided first-time school setup', 'Free lifetime local use'].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-300" /> {item}
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
      <section className="relative overflow-hidden border-t border-slate-100 bg-brand-950 py-20 text-white">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="container-page relative flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <h3 className="text-3xl font-extrabold balance">Ready to bring your school office into one app?</h3>
            <p className="mt-2.5 text-brand-100">Join schools across Cameroon already running {SITE.name} offline.</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <DownloadButton className="btn-light" label="Download now" />
            <Link to="/contact" className="btn border border-white/30 text-white hover:bg-white/10">
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
    <div className="px-4 text-center">
      <div className="font-display text-3xl font-extrabold text-brand-700 sm:text-4xl">{value}</div>
      <div className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:text-xs">{label}</div>
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
