import { LICENSE_WARNING_DAYS } from '@shared/constants'

const DAY_MS = 24 * 60 * 60 * 1000

/** Last calendar day of February for a given year (29 in leap years, else 28). */
export function lastDayOfFebruary(year: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return leap ? 29 : 28
}

/**
 * The annual renewal deadline: the last day of February on/after `from`.
 * Every license runs for one academic year and expires on this date. If `from`
 * is already at/after this year's end-of-February, the next year's is used, so
 * a freshly-issued license always has a meaningful runway.
 *
 * Returned at 23:59:59.999 local time so the whole of the last February day
 * still counts as licensed.
 */
export function endOfFebruaryDeadline(from: Date = new Date()): Date {
  const year = from.getFullYear()
  const thisYear = new Date(year, 1, lastDayOfFebruary(year), 23, 59, 59, 999)
  if (from.getTime() <= thisYear.getTime()) return thisYear
  const next = year + 1
  return new Date(next, 1, lastDayOfFebruary(next), 23, 59, 59, 999)
}

/** Whole days from now until `expiresAt` (negative once expired). */
export function daysUntil(expiresAt: string | Date, now: Date = new Date()): number {
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return Math.ceil((exp.getTime() - now.getTime()) / DAY_MS)
}

/**
 * The warning threshold that should fire for `daysRemaining`, or null if none.
 * Returns the smallest configured threshold that is still ≥ daysRemaining, so
 * the message escalates (60 → 30 → … → 1) as the deadline approaches.
 */
export function warningThresholdFor(daysRemaining: number): number | null {
  if (daysRemaining <= 0) return null
  let match: number | null = null
  for (const t of LICENSE_WARNING_DAYS) {
    if (daysRemaining <= t) match = t
  }
  return match
}
