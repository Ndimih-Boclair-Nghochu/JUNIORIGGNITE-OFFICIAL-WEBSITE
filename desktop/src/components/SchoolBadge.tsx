import type { School } from '@shared/types'

/**
 * The school's own identity mark, used inside a logged-in account (sidebars,
 * school home). Shows the uploaded school logo, or the school's initial on a
 * brand tile as a fallback — never the JuniorIgnite product logo.
 */
export function SchoolBadge({
  school,
  className = 'h-10 w-10'
}: {
  school: School | null
  className?: string
}): JSX.Element {
  if (school?.logoPath) {
    return (
      <img
        src={`file:///${school.logoPath.replace(/\\/g, '/')}`}
        className={`${className} rounded-xl object-cover`}
        alt={school.name ?? ''}
        draggable={false}
      />
    )
  }
  const initial = (school?.name?.trim()?.[0] ?? 'S').toUpperCase()
  return (
    <div
      className={`${className} flex items-center justify-center rounded-xl bg-brand-600 font-bold text-white`}
      aria-label={school?.name ?? 'School'}
    >
      {initial}
    </div>
  )
}
