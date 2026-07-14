import { useState } from 'react'
import { Download, Loader2, Check } from 'lucide-react'
import { api } from '@/lib/api'

/** Records the download on the backend, then starts the installer download. */
export function DownloadButton({
  className = 'btn-primary text-base',
  label = 'Download for Windows',
  size
}: {
  className?: string
  label?: string
  size?: string
}): JSX.Element {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handle(): Promise<void> {
    setState('loading')
    try {
      const { url } = await api.recordDownload()
      const a = document.createElement('a')
      a.href = url
      a.setAttribute('download', '')
      document.body.appendChild(a)
      a.click()
      a.remove()
      setState('done')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('idle')
    }
  }

  return (
    <button onClick={handle} className={className} disabled={state === 'loading'}>
      {state === 'loading' ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : state === 'done' ? (
        <Check className="h-5 w-5" />
      ) : (
        <Download className="h-5 w-5" />
      )}
      {state === 'done' ? 'Starting download…' : label}
      {size && state === 'idle' && <span className="opacity-70">· {size}</span>}
    </button>
  )
}
