import { useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import type { SchoolClass, Subject, Teacher, ClassSubject } from '@shared/types'

export function ClassSubjectsModal({
  schoolClass,
  subjects,
  teachers,
  onClose
}: {
  schoolClass: SchoolClass
  subjects: Subject[]
  teachers: Teacher[]
  onClose: () => void
}): JSX.Element {
  const [assigned, setAssigned] = useState<ClassSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [newSubjectId, setNewSubjectId] = useState<number>(subjects[0]?.id ?? 0)
  const [newTeacherId, setNewTeacherId] = useState<number | null>(null)
  const [newCoefficient, setNewCoefficient] = useState(1)

  async function load(): Promise<void> {
    setLoading(true)
    const res = await window.api.classes.get({ id: schoolClass.id })
    if (res.ok) setAssigned(res.data?.subjects ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [schoolClass.id])

  async function handleAdd(): Promise<void> {
    if (!newSubjectId) return
    await window.api.classes.assignSubject({
      classId: schoolClass.id,
      subjectId: newSubjectId,
      teacherId: newTeacherId,
      coefficient: newCoefficient
    })
    load()
  }

  async function handleRemove(subjectId: number): Promise<void> {
    await window.api.classes.unassignSubject({ classId: schoolClass.id, subjectId })
    load()
  }

  const unassignedSubjects = subjects.filter((s) => !assigned.some((a) => a.subjectId === s.id))

  return (
    <Modal title={`Subjects — ${schoolClass.name}`} onClose={onClose} widthClassName="max-w-xl">
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {assigned.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">No subjects assigned yet.</div>
            ) : (
              assigned.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <div className="font-medium text-slate-800">{a.subjectName}</div>
                    <div className="text-xs text-slate-400">
                      {a.teacherName ?? 'Unassigned'} · coef. {a.coefficient}
                    </div>
                  </div>
                  <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleRemove(a.subjectId)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {unassignedSubjects.length > 0 && (
            <div className="flex items-end gap-2 rounded-xl bg-slate-50 p-3">
              <div className="flex-1">
                <label className="label-field">Subject</label>
                <select className="input-field" value={newSubjectId} onChange={(e) => setNewSubjectId(Number(e.target.value))}>
                  {unassignedSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="label-field">Teacher</label>
                <select
                  className="input-field"
                  value={newTeacherId ?? ''}
                  onChange={(e) => setNewTeacherId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="label-field">Coef.</label>
                <input
                  type="number"
                  step="0.5"
                  className="input-field"
                  value={newCoefficient}
                  onChange={(e) => setNewCoefficient(Number(e.target.value))}
                />
              </div>
              <button className="btn-primary shrink-0" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
