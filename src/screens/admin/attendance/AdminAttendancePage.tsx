import { useEffect, useState } from 'react'
import { AttendanceBoard } from '../../shared/AttendanceBoard'
import type { SchoolClass } from '@shared/types'

export default function AdminAttendancePage(): JSX.Element {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classId, setClassId] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.classes.list()
      if (res.ok) {
        setClasses(res.data ?? [])
        setClassId(res.data?.[0]?.id ?? null)
      }
    })()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <select
          className="input-field w-56"
          value={classId ?? ''}
          onChange={(e) => setClassId(Number(e.target.value))}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {classId && <AttendanceBoard classId={classId} />}
    </div>
  )
}
