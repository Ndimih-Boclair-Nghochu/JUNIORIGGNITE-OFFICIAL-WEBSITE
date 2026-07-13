import { useEffect, useState } from 'react'
import { GitCompareArrows, Loader2, RefreshCw, FlaskConical, Check } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import type { SyncConflict } from '@shared/types'

const ENTITY_LABEL: Record<string, string> = {
  marks_published: 'Published mark',
  fee_payment: 'Fee payment'
}

export default function SyncIssuesPage(): JSX.Element {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load(): Promise<void> {
    const res = await window.api.sync.listConflicts()
    if (res.ok) setConflicts(res.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSync(): Promise<void> {
    setBusy(true)
    await window.api.sync.run()
    setBusy(false)
    load()
  }

  async function handleSimulate(): Promise<void> {
    setBusy(true)
    await window.api.sync.simulateConflict()
    setBusy(false)
    load()
  }

  async function handleResolve(conflictId: number, choice: 'local' | 'remote'): Promise<void> {
    await window.api.sync.resolveConflict({ conflictId, choice })
    load()
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sync Issues</h1>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={handleSimulate} disabled={busy}>
            <FlaskConical className="h-4 w-4" />
            Simulate conflict
          </button>
          <button className="btn-primary" onClick={handleSync} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run sync
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card h-40 animate-pulse bg-slate-100" />
      ) : conflicts.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No unresolved conflicts"
          description="Routine changes auto-resolve last-write-wins. Only published results and fee payments surface here for manual review."
        />
      ) : (
        <div className="space-y-5">
          {conflicts.map((c) => (
            <ConflictCard key={c.id} conflict={c} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </div>
  )
}

function ConflictCard({
  conflict,
  onResolve
}: {
  conflict: SyncConflict
  onResolve: (id: number, choice: 'local' | 'remote') => void
}): JSX.Element {
  const local = safeParse(conflict.localJson)
  const remote = safeParse(conflict.remoteJson)
  const keys = Array.from(new Set([...Object.keys(local), ...Object.keys(remote)]))

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {ENTITY_LABEL[conflict.entityType] ?? conflict.entityType}
          </span>
          <span className="ml-2 text-sm text-slate-400">#{conflict.entityId}</span>
        </div>
        <span className="text-xs text-slate-400">{new Date(conflict.createdAt).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ConflictColumn title="This device (local)" data={local} other={remote} keys={keys} />
        <ConflictColumn title="Other device (remote)" data={remote} other={local} keys={keys} accent />
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button className="btn-secondary" onClick={() => onResolve(conflict.id, 'local')}>
          <Check className="h-4 w-4" />
          Keep local
        </button>
        <button className="btn-primary" onClick={() => onResolve(conflict.id, 'remote')}>
          <Check className="h-4 w-4" />
          Keep remote
        </button>
      </div>
    </div>
  )
}

function ConflictColumn({
  title,
  data,
  other,
  keys,
  accent
}: {
  title: string
  data: Record<string, any>
  other: Record<string, any>
  keys: string[]
  accent?: boolean
}): JSX.Element {
  return (
    <div className={'rounded-xl border p-3 ' + (accent ? 'border-accent-200 bg-accent-50/40' : 'border-slate-200 bg-slate-50/40')}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <dl className="space-y-1 text-xs">
        {keys.map((k) => {
          const changed = JSON.stringify(data[k]) !== JSON.stringify(other[k])
          return (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-slate-400">{k}</dt>
              <dd className={changed ? 'font-semibold text-slate-900' : 'text-slate-600'}>{String(data[k] ?? '—')}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

function safeParse(json: string): Record<string, any> {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}
