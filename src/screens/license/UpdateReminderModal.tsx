import { Sparkles, RefreshCw } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { SUPPORT } from '@shared/constants'

/**
 * Gentle "check for a new version" nudge — never blocks work. `monthly` shows
 * once a month with a snooze; `annual` shows once a year at the start of a new
 * academic year. Both simply point the school at the JuniorIgnite website.
 */
export default function UpdateReminderModal({
  kind,
  onLater,
  onDismiss
}: {
  kind: 'monthly' | 'annual'
  /** "Check Later" — monthly only; reappears next launch. */
  onLater: () => void
  /** "Don't remind me this month" (monthly) / "Got it" (annual) — suppresses for the period. */
  onDismiss: () => void
}): JSX.Element {
  const isAnnual = kind === 'annual'

  return (
    <Modal title={isAnnual ? `${SUPPORT.product} Update Reminder` : `${SUPPORT.product} Update Reminder`} onClose={onLater}>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
          {isAnnual ? <Sparkles className="h-7 w-7 text-brand-600" /> : <RefreshCw className="h-7 w-7 text-brand-600" />}
        </div>

        {isAnnual ? (
          <p className="mt-4 leading-relaxed text-slate-600">
            A new academic year is a great time to update {SUPPORT.product}. Visit the {SUPPORT.product} website to
            download the latest version and enjoy new features, security improvements, and performance enhancements.
          </p>
        ) : (
          <p className="mt-4 leading-relaxed text-slate-600">
            Thank you for choosing {SUPPORT.product}. We regularly improve performance, security, and features. Please
            visit the {SUPPORT.product} website once this month to check whether a new version is available. Keeping your
            software updated ensures the best experience.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {isAnnual ? (
          <button className="btn-primary" onClick={onDismiss}>
            Got it
          </button>
        ) : (
          <>
            <button className="btn-secondary" onClick={onLater}>
              Check Later
            </button>
            <button className="btn-primary" onClick={onDismiss}>
              Don't remind me this month
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
