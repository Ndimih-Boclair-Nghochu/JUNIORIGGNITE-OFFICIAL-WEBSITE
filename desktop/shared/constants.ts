// Shared, non-secret constants used by both the Electron main process and the
// renderer. No Node-only or DOM-only imports so it can be shared verbatim.

/** ELIGNITE support / renewal contact details, surfaced across the licensing UI. */
export const SUPPORT = {
  vendor: 'ELIGNITE',
  product: 'JuniorIgnite',
  phonePrimary: '678897272',
  phoneSecondary: '652859412',
  /** Mobile Money number for annual renewal payments. */
  mobileMoney: '678897272'
} as const

/**
 * Days-before-expiry at which a launch-time license warning is shown. Ordered
 * high → low; the smallest threshold still ≥ daysRemaining wins, so the warning
 * becomes more prominent as expiry approaches.
 */
export const LICENSE_WARNING_DAYS = [60, 30, 14, 7, 3, 1] as const

/** Annual licence fee per enrolled student, in XAF (FCFA). */
export const LICENSE_FEE_PER_STUDENT_XAF = 150

/** Formats an XAF amount with thousands separators, e.g. 45000 → "45,000 XAF". */
export function formatXaf(amount: number): string {
  return `${new Intl.NumberFormat('en').format(amount)} XAF`
}
