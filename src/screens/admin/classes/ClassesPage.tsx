import { useEffect, useState } from 'react'
import { School2, Plus, Pencil, Trash2, KeyRound, BookOpen } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { Modal } from '../../../components/Modal'
import { ClassFormModal } from './ClassFormModal'
import { ClassSubjectsModal } from './ClassSubjectsModal'
import type { SchoolClass, Teacher, Subject } from '@shared/types'

export default function ClassesPage(): JSX.Element {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [formClass, setFormClass] = useState<SchoolClass | null | undefined>(undefined)
  const [subjectsClass, setSubjectsClass] = useState<SchoolClass | null>(null)
  const [revealedCode, setRevealedCode] = useState<{ name: string; code: string } | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    const [c, t, s] = await Promise.all([window.api.classes.list(), window.api.teachers.list(), window.api.subjects.list()])
    if (c.ok) setClasses(c.data ?? [])
    if (t.ok) setTeachers(t.data ?? [])
    if (s.ok) setSubjects(s.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(c: SchoolClass): Promise<void> {
    if (!confirm(`Delete class ${c.name}?`)) return
    const res = await window.api.classes.delete({ id: c.id })
    if (!res.ok) alert(res.error)
    load()
  }

  async function handleRegenerate(c: SchoolClass): Promise<void> {
    const res = await window.api.classes.regenerateCode({ id: c.id })
    if (res.ok && res.data) setRevealedCode({ name: c.name, code: res.data.accessCode })
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
        <button className="btn-primary" onClick={() => setFormClass(null)}>
          <Plus className="h-4 w-4" />
          Create class
        </button>
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : classes.length === 0 ? (
        <EmptyState icon={School2} title="No classes yet" description="Create your first class to start enrolling students." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{c.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        (c.subsystem === 'anglophone' ? 'bg-brand-50 text-brand-700' : 'bg-accent-50 text-accent-700')
                      }
                    >
                      {c.subsystem === 'anglophone' ? 'Anglophone' : 'Francophone'}
                    </span>
                    {/* Level drives which class pupils are promoted into. */}
                    <span
                      className={
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        (c.levelName ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700')
                      }
                      title={c.levelName ? 'Class level' : 'Set a level so pupils can be promoted'}
                    >
                      {c.levelName ?? 'No level'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                <div>{c.classTeacherName ?? 'No class teacher'}</div>
                <div>
                  {c.studentCount} / {c.capacity} students
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <button className="btn-secondary flex-1" onClick={() => setSubjectsClass(c)}>
                  <BookOpen className="h-4 w-4" />
                  Subjects
                </button>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => setFormClass(c)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => handleRegenerate(c)} title="Regenerate access code">
                  <KeyRound className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formClass !== undefined && (
        <ClassFormModal
          schoolClass={formClass}
          teachers={teachers}
          onClose={() => setFormClass(undefined)}
          onSaved={(accessCode) => {
            setFormClass(undefined)
            load()
            if (accessCode) setRevealedCode({ name: 'New class', code: accessCode })
          }}
        />
      )}
      {subjectsClass && (
        <ClassSubjectsModal schoolClass={subjectsClass} subjects={subjects} teachers={teachers} onClose={() => setSubjectsClass(null)} />
      )}
      {revealedCode && (
        <Modal title={`Access code — ${revealedCode.name}`} onClose={() => setRevealedCode(null)}>
          <p className="mb-4 text-sm text-slate-500">
            Write this down and share it with the class teacher. It will not be shown again.
          </p>
          <div className="rounded-xl bg-slate-50 py-4 text-center font-mono text-2xl tracking-widest text-brand-700">
            {revealedCode.code}
          </div>
        </Modal>
      )}
    </div>
  )
}
