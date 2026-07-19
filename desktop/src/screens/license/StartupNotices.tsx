import { useEffect, useState } from 'react'
import type { StartupNotices as Notices, UpdateInfo } from '@shared/types'
import LicenseWarningModal from './LicenseWarningModal'
import UpdateReminderModal from './UpdateReminderModal'
import UpdateAvailableModal from './UpdateAvailableModal'

type Notice = 'warning' | 'update' | 'annual' | 'monthly'

/**
 * Fetches the launch-time notices once and shows them one at a time (never more
 * than one modal at once): the escalating license expiry warning first, then
 * the annual update nudge, then the monthly one. Mounted inside the unlocked
 * app, so it only handles the active-license case — expiry is handled by the
 * full-screen lock instead.
 */
export default function StartupNotices(): JSX.Element | null {
  const [notices, setNotices] = useState<Notices | null>(null)
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [queue, setQueue] = useState<Notice[]>([])

  useEffect(() => {
    ;(async () => {
      const [noticeRes, updateRes] = await Promise.all([
        window.api.license.startupNotices(),
        // Silently fails when offline — schools without internet see nothing.
        window.api.app.checkUpdate()
      ])
      if (!noticeRes.ok || !noticeRes.data) return
      const n = noticeRes.data
      setNotices(n)

      const q: Notice[] = []
      if (n.license.status === 'active' && n.license.warningThreshold !== null) q.push('warning')

      // A real update beats the generic "go and check" reminders.
      const u = updateRes.ok ? updateRes.data ?? null : null
      if (u?.updateAvailable) {
        setUpdate(u)
        q.push('update')
      } else {
        if (n.showAnnualUpdate) q.push('annual')
        if (n.showMonthlyUpdate) q.push('monthly')
      }
      setQueue(q)
    })()
  }, [])

  function advance(): void {
    setQueue((q) => q.slice(1))
  }

  if (!notices || queue.length === 0) return null
  const current = queue[0]

  if (current === 'warning') {
    return <LicenseWarningModal license={notices.license} onClose={advance} />
  }

  if (current === 'update' && update) {
    return <UpdateAvailableModal info={update} onClose={advance} />
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
