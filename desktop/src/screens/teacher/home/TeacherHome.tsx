import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ClipboardCheck, NotebookPen, FileBadge } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import type { Student } from '@shared/types'

export default function TeacherHome(): JSX.Element {
  const session = useAuthStore((s) => s.session)
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [attendance, setAttendance] = useState<{ presentPct: number } | null>(null)

  useEffect(() => {
    ;(async () => {
      const students = await window.api.students.list({})
      if (students.ok) setCount((students.data ?? []).length)
      const summary = await window.api.attendance.summary({})
      if (summary.ok && summary.data && summary.data.length > 0) {
        const avg = Math.round(summary.data.reduce((s, r) => s + r.presentPct, 0) / summary.data.length)
        setAttendance({ presentPct: avg })
      }
    })()
  }, [])

  if (session?.role !== 'teacher') return <></>

  const tiles = [
    { label: 'Take attendance', icon: ClipboardCheck, to: '/teacher/attendance' },
    { label: 'Enter marks', icon: NotebookPen, to: '/teacher/marks' },
    { label: 'View students', icon: Users, to: '/teacher/students' },
    { label: 'Report cards', icon: FileBadge, to: '/teacher/report-preview' }
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">{session.className}</h1>
      <p className="mb-6 text-slate-500">Welcome, class teacher. You have access scoped to this class only.</p>

      <div className="mb-8 grid grid-cols-2 gap-5 sm:grid-cols-2">
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500">Students</div>
            <div className="text-xl font-bold text-slate-900">{count}</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500">Avg. attendance</div>
            <div className="text-xl font-bold text-slate-900">{attendance ? `${attendance.presentPct}%` : '—'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {tiles.map((tile) => (
          <button
            key={tile.to}
            onClick={() => navigate(tile.to)}
            className="card flex flex-col items-center gap-3 py-8 transition hover:border-brand-300 hover:shadow-md"
          >
            <tile.icon className="h-8 w-8 text-brand-500" />
            <span className="text-sm font-medium text-slate-700">{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
