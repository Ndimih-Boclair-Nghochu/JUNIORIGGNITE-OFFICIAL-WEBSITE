import { useEffect, useState } from 'react'
import { Loader2, ClipboardCheck } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import type { AttendanceStatus } from '@shared/types'

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: 'present', label: 'Present', activeClass: 'bg-brand-600 text-white' },
  { value: 'absent', label: 'Absent', activeClass: 'bg-red-600 text-white' },
  { value: 'sick', label: 'Sick', activeClass: 'bg-amber-500 text-white' },
  { value: 'late', label: 'Late', activeClass: 'bg-accent-500 text-white' }
]

interface Row {
  studentId: number
  firstName: string
  lastName: string
  status: AttendanceStatus | null
}

export function AttendanceBoard({ classId }: { classId: number }): JSX.Element {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    const res = await window.api.attendance.getForDate({ classId, date })
    if (res.ok) setRows(res.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date])

  async function handleMark(studentId: number, status: AttendanceStatus): Promise<void> {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)))
    setSavingId(studentId)
    await window.api.attendance.mark({ studentId, classId, date, status })
    setSavingId(null)
  }

  const markedCount = rows.filter((r) => r.status !== null).length

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <label className="label-field">Date</label>
          <input type="date" className="input-field w-48" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="text-sm text-slate-500">
          {markedCount} / {rows.length} marked
        </div>
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No students in this class" />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {rows.map((r) => (
            <div key={r.studentId} className="flex items-center justify-between px-5 py-3">
              <div className="font-medium text-slate-800">
                {r.firstName} {r.lastName}
              </div>
              <div className="flex items-center gap-2">
                {savingId === r.studentId && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleMark(r.studentId, opt.value)}
                      className={
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition ' +
                        (r.status === opt.value ? opt.activeClass : 'text-slate-500 hover:bg-white')
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
