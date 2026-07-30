import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'

/**
 * Sends the visitor to the dedicated download page, where the download starts
 * with a progress bar and the setup guide is offered alongside it. Kept as a
 * component so every call site shares one look and one destination.
 */
export function DownloadButton({
  className = 'btn-primary text-base',
  label = 'Download for Windows',
  size
}: {
  className?: string
  label?: string
  size?: string
}): JSX.Element {
  return (
    <Link to="/download" className={className}>
      <Download className="h-5 w-5" />
      {label}
      {size && <span className="opacity-70">· {size}</span>}
    </Link>
  )
}
