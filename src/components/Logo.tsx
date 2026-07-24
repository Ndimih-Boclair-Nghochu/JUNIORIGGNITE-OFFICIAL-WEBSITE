import { Link } from 'react-router-dom'
import { SITE } from '@/lib/config'

export function Logo({
  className = 'h-9 w-9',
  withText = true,
  to = '/home'
}: {
  className?: string
  withText?: boolean
  to?: string
}): JSX.Element {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <img src="/logo.png" alt={SITE.name} className={className} draggable={false} />
      {withText && (
        <span className="font-display text-lg font-extrabold tracking-tight text-ink">
          Junior<span className="text-brand-600">Ignite</span>
        </span>
      )}
    </Link>
  )
}
