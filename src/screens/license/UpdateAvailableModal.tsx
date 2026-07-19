import { useState } from 'react'
import { Sparkles, Download, Loader2 } from 'lucide-react'
import { Modal } from '../../components/Modal'
import type { UpdateInfo } from '@shared/types'
import { SUPPORT } from '@shared/constants'

/**
 * Shown when the website advertises a newer release. "Update now" opens the
 * JuniorIgnite download page in the school's browser so they get the installer
 * from our own site.
 */
export default function UpdateAvailableModal({
  info,
  onClose
}: {
  info: UpdateInfo
  onClose: () => void
}): JSX.Element {
  const [opening, setOpening] = useState(false)

  async function handleUpdate(): Promise<void> {
    setOpening(true)
    await window.api.app.openExternal({ url: info.downloadPageUrl })
    setOpening(false)
    onClose()
  }

  return (
    <Modal title={`${SUPPORT.product} update available`} onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
          <Sparkles className="h-7 w-7 text-brand-600" />
        </div>

        <p className="mt-4 leading-relaxed text-slate-600">
          A newer version of {SUPPORT.product} is available. Updating brings the latest features, security improvements
          and performance enhancements.
        </p>

        <div className="mt-4 flex items-center justify-center gap-6 rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">You have</div>
            <div className="font-mono text-base font-semibold text-slate-700">v{info.currentVersion}</div>
          </div>
          <div className="text-slate-300">→</div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-brand-600">Latest</div>
            <div className="font-mono text-base font-bold text-brand-700">v{info.latestVersion}</div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Your school's data is never affected by an update — it stays on this computer.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn-secondary" onClick={onClose}>
          Later
        </button>
        <button className="btn-primary" onClick={handleUpdate} disabled={opening}>
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Update now
        </button>
      </div>
    </Modal>
  )
}
