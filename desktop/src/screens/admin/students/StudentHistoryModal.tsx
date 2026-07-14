import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import type { Student, StudentHistoryEntry } from '@shared/types'

const EVENT_LABEL: Record<string, string> = {
  enrollment: 'Enrolled',
  promotion: 'Promoted',
  transfer: 'Transferred',
  withdrawal: 'Withdrawn',
  graduation: 'Graduated',
  repeat: 'Marked repeating'
}

export function StudentHistoryModal({ student, onClose }: { student: Student; onClose: () => void }): JSX.Element {
  const [history, setHistory] = useState<StudentHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.students.history({ studentId: student.id })
      if (res.ok) setHistory(res.data ?? [])
      setLoading(false)
    })()
  }, [student.id])

  return (
    <Modal title={`History — ${student.firstName} ${student.lastName}`} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : history.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No history yet.</p>
      ) : (
        <ol className="space-y-4 border-l-2 border-slate-100 pl-4">
          {history.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
              <div className="text-sm font-medium text-slate-800">{EVENT_LABEL[h.eventType] ?? h.eventType}</div>
              <div className="text-xs text-slate-500">
                {h.fromClassName && `${h.fromClassName} → `}
                {h.toClassName ?? '—'}
              </div>
              {h.notes && <div className="mt-0.5 text-xs text-slate-400">{h.notes}</div>}
              <div className="mt-0.5 text-xs text-slate-300">{new Date(h.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
