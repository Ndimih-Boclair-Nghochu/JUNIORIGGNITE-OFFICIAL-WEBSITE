import { useEffect, useMemo, useState } from 'react'
import { Users, Plus, Search, History, Pencil, Trash2, ChevronDown, IdCard } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { StudentFormModal } from './StudentFormModal'
import { StudentActionModal, type StudentAction } from './StudentActionModal'
import { StudentHistoryModal } from './StudentHistoryModal'
import type { Student, SchoolClass } from '@shared/types'

const STATUS_BADGE: Record<Student['status'], string> = {
  active: 'bg-brand-50 text-brand-700',
  promoted: 'bg-slate-100 text-slate-600',
  transferred: 'bg-accent-50 text-accent-700',
  withdrawn: 'bg-red-50 text-red-600',
  graduated: 'bg-purple-50 text-purple-600',
  repeating: 'bg-amber-50 text-amber-700'
}

export default function StudentsPage(): JSX.Element {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [formStudent, setFormStudent] = useState<Student | null | undefined>(undefined)
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null)
  const [actionState, setActionState] = useState<{ student: Student; action: StudentAction } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    const [s, c] = await Promise.all([window.api.students.list({ search: search || undefined }), window.api.classes.list()])
    if (s.ok) setStudents(s.data ?? [])
    if (c.ok) setClasses(c.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [search])

  const filtered = useMemo(
    () => (classFilter === 'all' ? students : students.filter((s) => s.classId === classFilter)),
    [students, classFilter]
  )

  async function handleDelete(student: Student): Promise<void> {
    if (!confirm(`Delete ${student.firstName} ${student.lastName}? This cannot be undone.`)) return
    const res = await window.api.students.delete({ id: student.id })
    if (res.ok) load()
  }

  async function handleIdCard(student: Student): Promise<void> {
    setOpenMenuId(null)
    const res = await window.api.idCards.generate({ studentId: student.id, format: 'paper' })
    if (!res.ok) alert(res.error)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <button className="btn-primary" onClick={() => setFormStudent(null)}>
          <Plus className="h-4 w-4" />
          Register student
        </button>
      </div>

      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or admission number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-56"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No students found" description="Register your first student to get started." />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Admission No.</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Gender</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3">
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
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{s.admissionNo}</td>
                  <td className="px-5 py-3 text-slate-600">{s.className ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{s.gender === 'male' ? 'Male' : 'Female'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => setHistoryStudent(s)} title="History">
                        <History className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => setFormStudent(s)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => handleIdCard(s)} title="Generate ID card">
                        <IdCard className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          className="flex items-center gap-1 rounded-lg px-2 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                          title="Workflow"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {openMenuId === s.id && (
                          <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                            {(['promote', 'transfer', 'markRepeating', 'withdraw', 'graduate'] as StudentAction[]).map(
                              (action) => (
                                <button
                                  key={action}
                                  className="block w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setActionState({ student: s, action })
                                  }}
                                >
                                  {action === 'markRepeating' ? 'Mark repeating' : action.charAt(0).toUpperCase() + action.slice(1)}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(s)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formStudent !== undefined && (
        <StudentFormModal
          student={formStudent}
          classes={classes}
          onClose={() => setFormStudent(undefined)}
          onSaved={() => {
            setFormStudent(undefined)
            load()
          }}
        />
      )}
      {historyStudent && <StudentHistoryModal student={historyStudent} onClose={() => setHistoryStudent(null)} />}
      {actionState && (
        <StudentActionModal
          student={actionState.student}
          action={actionState.action}
          classes={classes}
          onClose={() => setActionState(null)}
          onDone={() => {
            setActionState(null)
            load()
          }}
        />
      )}
    </div>
  )
}
