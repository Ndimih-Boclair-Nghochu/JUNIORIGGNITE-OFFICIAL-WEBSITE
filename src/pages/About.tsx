import { Link } from 'react-router-dom'
import { Target, HeartHandshake, WifiOff, ShieldCheck, Languages, Coins, GraduationCap, ArrowRight, Sparkles } from 'lucide-react'
import { SectionHeader } from '@/components/SectionHeader'
import { Reveal } from '@/components/Reveal'
import { DownloadButton } from '@/components/DownloadButton'
import { TeamSection } from '@/components/TeamSection'
import { SITE } from '@/lib/config'

const VALUES = [
  { icon: WifiOff, title: 'Offline-first', desc: 'Every core task works without internet. Connectivity is a bonus, never a requirement.' },
  { icon: ShieldCheck, title: 'Private & secure', desc: 'Your data stays on your computer — encrypted, hashed and logged. Nothing leaves unless you choose.' },
  { icon: Languages, title: 'Truly bilingual', desc: 'English and French throughout, with proper Anglophone and Francophone report-card systems.' },
  { icon: Coins, title: 'Affordable', desc: 'One app for the whole school office — no per-seat cloud fees draining tight school budgets.' }
]

const AUDIENCE = [
  { icon: GraduationCap, title: 'Nursery & primary schools', desc: 'Public, private and faith-based schools managing dozens to thousands of pupils.' },
  { icon: HeartHandshake, title: 'School administrators', desc: 'Head teachers and secretaries who need the office organised without IT staff.' },
  { icon: Target, title: 'Teachers', desc: 'Class teachers taking attendance, entering marks and previewing report cards for their class.' }
]

export default function About(): JSX.Element {
  return (
    <>
      {/* Intro */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/50 to-white">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-orb-a absolute -left-40 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-300/30 blur-3xl" />
          <div className="animate-orb-b absolute -right-40 top-10 h-[26rem] w-[26rem] rounded-full bg-accent-300/25 blur-3xl" />
        </div>
        <div className="container-page relative py-24 text-center">
          <Reveal className="mx-auto max-w-3xl">
            <span className="eyebrow"><Sparkles className="h-3.5 w-3.5 text-accent-500" /> About {SITE.name}</span>
            <h1 className="mt-5 text-display-sm font-extrabold text-ink balance sm:text-display lg:text-display-lg">
              Purpose-built for schools that can&apos;t rely on the internet
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-muted">
              {SITE.name} was created to bring modern school management to nursery and primary schools across
              Cameroon — where power and internet are often unreliable, but the work of educating children never stops.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-slate-100 bg-slate-50/70 py-24">
        <div className="container-page grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow"><Target className="h-3.5 w-3.5 text-accent-500" /> Our mission</span>
            <h2 className="mt-5 text-display-sm font-extrabold text-ink balance sm:text-4xl">
              Give every school a dependable office — online or not
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink-muted">
              <p>
                Cloud school-management tools assume fast, constant internet and monthly budgets. Most schools here
                have neither. So we built the opposite: a desktop application that installs once and runs entirely on
                the school&apos;s own computer.
              </p>
              <p>
                Registering a pupil, taking attendance, entering marks, generating a report card or printing an ID
                card never waits on a network. When you do have internet, optional backup and sync simply layer on top.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid gap-5 sm:grid-cols-2">
              {VALUES.map((v) => (
                <div key={v.title} className="card-hover !p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-ink">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{v.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24">
        <div className="container-page">
          <SectionHeader eyebrow="Who it's for" title="Made for the whole school" subtitle="From the head teacher's office to each class teacher, everyone gets exactly the access they need." />
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {AUDIENCE.map((a, i) => (
              <Reveal key={a.title} delay={i * 90}>
                <div className="card-hover group h-full">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 transition-all duration-300 group-hover:bg-accent-500 group-hover:text-white">
                    <a.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-ink">{a.title}</h3>
                  <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-muted">{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Story band */}
      <section className="bg-brand-700 py-16 text-white">
        <div className="container-page grid gap-8 sm:grid-cols-3">
          {[
            { k: 'Nursery & Primary', v: 'Designed around the Cameroonian nursery & primary school calendar and grading.' },
            { k: 'Two subsystems', v: 'Anglophone and Francophone report cards, terminology and templates done right.' },
            { k: 'Offline by default', v: 'No internet, no cloud lock-in, no monthly fees to keep the office running.' }
          ].map((s) => (
            <Reveal key={s.k}>
              <h3 className="text-xl font-extrabold">{s.k}</h3>
              <p className="mt-2 text-brand-50">{s.v}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Team — only renders if the founder has published members */}
      <TeamSection />

      {/* CTA */}
      <section className="py-20">
        <div className="container-page flex flex-col items-center justify-between gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center md:flex-row md:text-left">
          <div>
            <h3 className="text-2xl font-extrabold text-ink">Try {SITE.name} at your school</h3>
            <p className="mt-2 text-ink-muted">Download the app, install it in minutes, and set up your school with your own classes and pupils.</p>
          </div>
          <div className="flex gap-3">
            <DownloadButton className="btn-primary" label="Download the app" />
            <Link to="/contact" className="btn-ghost">Contact us <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </>
  )
}
