import { useEffect, useState } from 'react'
import type { StartupNotices as Notices } from '@shared/types'
import LicenseWarningModal from './LicenseWarningModal'
import UpdateReminderModal from './UpdateReminderModal'

type Notice = 'warning' | 'annual' | 'monthly'

/**
 * Fetches the launch-time notices once and shows them one at a time (never more
 * than one modal at once): the escalating license expiry warning first, then
 * the annual update nudge, then the monthly one. Mounted inside the unlocked
 * app, so it only handles the active-license case — expiry is handled by the
 * full-screen lock instead.
 */
export default function StartupNotices(): JSX.Element | null {
  const [notices, setNotices] = useState<Notices | null>(null)
  const [queue, setQueue] = useState<Notice[]>([])

  useEffect(() => {
    window.api.license.startupNotices().then((res) => {
      if (!res.ok || !res.data) return
      const n = res.data
      setNotices(n)
      const q: Notice[] = []
      if (n.license.status === 'active' && n.license.warningThreshold !== null) q.push('warning')
      if (n.showAnnualUpdate) q.push('annual')
      if (n.showMonthlyUpdate) q.push('monthly')
      setQueue(q)
    })
  }, [])

  function advance(): void {
    setQueue((q) => q.slice(1))
  }

  if (!notices || queue.length === 0) return null
  const current = queue[0]

  if (current === 'warning') {
    return <LicenseWarningModal license={notices.license} onClose={advance} />
  }

  if (current === 'annual') {
    return (
      <UpdateReminderModal
        kind="annual"
        onLater={advance}
        onDismiss={() => {
          // Backend already marked the annual nudge shown; just advance.
          advance()
        }}
      />
    )
  }

  return (
    <UpdateReminderModal
      kind="monthly"
      onLater={advance}
      onDismiss={() => {
        window.api.license.dismissUpdate({ kind: 'monthly' })
        advance()
      }}
    />
  )
}
