import { useEffect, useState } from 'react'
import { Inbox, Mail, RefreshCw, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { ContactMsg } from '@/lib/types'

/** Messages submitted through the public contact form. */
export function ContactInbox(): JSX.Element {
  const [msgs, setMsgs] = useState<ContactMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    try {
      setMsgs(await api.contacts())
      setError(null)
    } catch {
      setError('Could not load messages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-brand-600" />
          <h3 className="text-lg font-bold text-ink">Messages</h3>
          {msgs.length > 0 && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {msgs.length}
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-ink-soft hover:bg-slate-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>
      <p className="mb-4 text-sm text-ink-muted">Everything sent through the website's contact form arrives here.</p>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : msgs.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-ink-muted">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-semibold text-ink">
                  {m.name}
                  {m.organization && <span className="ml-2 text-sm font-normal text-ink-muted">· {m.organization}</span>}
                </div>
                <span className="text-xs text-ink-muted">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <a
                href={`mailto:${m.email}`}
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                {m.email}
              </a>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
