import { useEffect, useState } from 'react'
import { GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { TeacherFormModal } from './TeacherFormModal'
import type { Teacher } from '@shared/types'

export default function TeachersPage(): JSX.Element {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [formTeacher, setFormTeacher] = useState<Teacher | null | undefined>(undefined)

  async function load(): Promise<void> {
    setLoading(true)
    const res = await window.api.teachers.list()
    if (res.ok) setTeachers(res.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(teacher: Teacher): Promise<void> {
    if (!confirm(`Delete ${teacher.firstName} ${teacher.lastName}?`)) return
    const res = await window.api.teachers.delete({ id: teacher.id })
    if (res.ok) load()
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Teachers</h1>
        <button className="btn-primary" onClick={() => setFormTeacher(null)}>
          <Plus className="h-4 w-4" />
          Add teacher
        </button>
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : teachers.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No teachers yet" description="Add your first teacher to assign them to classes." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((t) => (
            <div key={t.id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-semibold text-slate-500">
                  {t.photoPath ? (
                    <img src={`file:///${t.photoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
                  ) : (
                    `${t.firstName[0]}${t.lastName[0]}`
                  )}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {t.firstName} {t.lastName}
                  </div>
                  <div className="text-xs text-slate-400">{t.qualifications ?? '—'}</div>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                <div>{t.phone ?? '—'}</div>
                <div>{t.email ?? '—'}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.assignedClassNames.length === 0 ? (
                  <span className="text-xs text-slate-400">No classes assigned</span>
                ) : (
                  t.assignedClassNames.map((c) => (
                    <span key={c} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                      {c}
                    </span>
                  ))
                )}
              </div>
              <div className="mt-auto flex justify-end gap-1 pt-2">
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => setFormTeacher(t)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(t)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formTeacher !== undefined && (
        <TeacherFormModal
          teacher={formTeacher}
          onClose={() => setFormTeacher(undefined)}
          onSaved={() => {
            setFormTeacher(undefined)
            load()
          }}
        />
      )}
    </div>
  )
}
