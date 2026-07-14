import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = true
}: {
  eyebrow: string
  title: ReactNode
  subtitle?: string
  center?: boolean
}): JSX.Element {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg leading-relaxed text-ink-muted">{subtitle}</p>}
    </Reveal>
  )
}
