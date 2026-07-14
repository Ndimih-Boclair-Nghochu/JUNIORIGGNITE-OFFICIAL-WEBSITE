import { useEffect, useState } from 'react'
import { DatabaseBackup, Loader2, Download, Upload, HardDrive } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'

export default function BackupPage(): JSX.Element {
  const [backups, setBackups] = useState<{ path: string; name: string; size: number; createdAt: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'create' | 'restore' | null>(null)

  async function load(): Promise<void> {
    const res = await window.api.backup.list()
    if (res.ok) setBackups(res.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(): Promise<void> {
    setBusy('create')
    const res = await window.api.backup.create()
    setBusy(null)
    if (res.ok) load()
  }

  async function handleRestore(): Promise<void> {
    if (!confirm('Restoring will replace all current data with the backup. A safety snapshot of your current data is taken first, then the app restarts. Continue?')) return
    setBusy('restore')
    const res = await window.api.backup.restore()
    setBusy(null)
    if (!res.ok) alert(res.error)
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Backup & Restore</h1>

      <div className="mb-6 flex gap-3">
        <button className="btn-primary" onClick={handleCreate} disabled={busy !== null}>
          {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Create backup
        </button>
        <button className="btn-secondary" onClick={handleRestore} disabled={busy !== null}>
          {busy === 'restore' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Restore from file
        </button>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Local backups</h2>
      {loading ? (
        <div className="card h-40 animate-pulse bg-slate-100" />
      ) : backups.length === 0 ? (
        <EmptyState icon={DatabaseBackup} title="No backups yet" description="Create your first backup to keep your data safe." />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {backups.map((b) => (
            <div key={b.path} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="flex items-center gap-3">
                <HardDrive className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-700">{b.name}</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-400">
                <span>{(b.size / 1024).toFixed(0)} KB</span>
                <span>{new Date(b.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
