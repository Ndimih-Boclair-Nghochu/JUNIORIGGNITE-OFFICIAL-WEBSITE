import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import type { ActivityLogEntry } from '@shared/types'

export default function ActivityLogPage(): JSX.Element {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.activityLog.list({ limit: 200 })
      if (res.ok) setEntries(res.data ?? [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Activity Log</h1>
      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="No activity recorded yet" />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                    (e.actorType === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-accent-50 text-accent-700')
                  }
                >
                  {e.actorLabel}
                </span>
                <span className="text-slate-700">{e.action}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
