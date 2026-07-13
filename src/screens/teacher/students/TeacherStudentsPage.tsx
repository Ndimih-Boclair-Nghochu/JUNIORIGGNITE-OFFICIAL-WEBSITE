import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { EmptyState } from '../../../components/EmptyState'
import { Modal } from '../../../components/Modal'
import type { Student } from '@shared/types'

export default function TeacherStudentsPage(): JSX.Element {
  const session = useAuthStore((s) => s.session)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<Student | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.students.list({})
      if (res.ok) setStudents(res.data ?? [])
      setLoading(false)
    })()
  }, [])

  if (session?.role !== 'teacher') return <></>

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Students — {session.className}</h1>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students in this class" />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setViewing(s)}
              className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                  {s.photoPath ? (
                    <img src={`file:///${s.photoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
                  ) : (
                    `${s.firstName[0]}${s.lastName[0]}`
                  )}
                </div>
                <span className="font-medium text-slate-800">
                  {s.firstName} {s.lastName}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-400">{s.admissionNo}</span>
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <Modal title={`${viewing.firstName} ${viewing.lastName}`} onClose={() => setViewing(null)}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Admission No.</dt>
              <dd className="font-medium text-slate-800">{viewing.admissionNo}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Gender</dt>
              <dd className="font-medium text-slate-800">{viewing.gender === 'male' ? 'Male' : 'Female'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Date of birth</dt>
              <dd className="font-medium text-slate-800">{viewing.dob ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Status</dt>
              <dd className="font-medium text-slate-800">{viewing.status}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Parent / guardian</dt>
              <dd className="font-medium text-slate-800">{viewing.parentName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Parent phone</dt>
              <dd className="font-medium text-slate-800">{viewing.parentPhone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Emergency contact</dt>
              <dd className="font-medium text-slate-800">{viewing.emergencyContact ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Medical notes</dt>
              <dd className="font-medium text-slate-800">{viewing.medicalNotes ?? '—'}</dd>
            </div>
          </dl>
        </Modal>
      )}
    </div>
  )
}
