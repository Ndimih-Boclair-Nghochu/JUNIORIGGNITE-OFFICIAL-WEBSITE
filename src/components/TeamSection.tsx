import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { Reveal } from './Reveal'
import { api } from '@/lib/api'
import type { TeamMember } from '@/lib/types'

/** Initials fallback when a member has no photo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * The public "Meet the team" section on the About page. Renders only the
 * members the founder has published from the console; renders nothing at all
 * when there are none, so the page never shows an empty shell.
 */
export function TeamSection(): JSX.Element | null {
  const [team, setTeam] = useState<TeamMember[] | null>(null)

  useEffect(() => {
    api
      .team()
      .then(setTeam)
      .catch(() => setTeam([]))
  }, [])

  if (!team || team.length === 0) return null

  return (
    <section className="py-20">
      <div className="container-page">
        <SectionHeader
          eyebrow="Meet the team"
          title="The people behind JuniorIgnite"
          subtitle="A small team building dependable tools for schools across Cameroon."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m, i) => (
            <Reveal key={m.id} delay={(i % 3) * 80}>
              <div className="flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                {m.photo ? (
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-50"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white ring-4 ring-brand-50">
                    {initials(m.name) || <Users className="h-8 w-8" />}
                  </div>
                )}
                <h3 className="mt-5 text-lg font-bold text-ink">{m.name}</h3>
                {m.role && <p className="mt-0.5 text-sm font-semibold text-brand-600">{m.role}</p>}
                {m.bio && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{m.bio}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
