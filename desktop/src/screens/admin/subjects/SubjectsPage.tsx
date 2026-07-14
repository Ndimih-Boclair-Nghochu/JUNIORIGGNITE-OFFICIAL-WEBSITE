import { useEffect, useState } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { Modal } from '../../../components/Modal'
import type { Subject, SchoolClass } from '@shared/types'

export default function SubjectsPage(): JSX.Element {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loading, setLoading] = useState(true)
  const [formSubject, setFormSubject] = useState<Subject | null | undefined>(undefined)

  async function load(): Promise<void> {
    setLoading(true)
    const [s, c] = await Promise.all([window.api.subjects.list(), window.api.classes.list()])
    if (s.ok) setSubjects(s.data ?? [])
    if (c.ok) setClasses(c.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(s: Subject): Promise<void> {
    if (!confirm(`Delete subject ${s.name}? This also removes it from any class it is assigned to.`)) return
    const res = await window.api.subjects.delete({ id: s.id })
    if (res.ok) load()
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
        <button className="btn-primary" onClick={() => setFormSubject(null)}>
          <Plus className="h-4 w-4" />
          Add subject
        </button>
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects yet" description="Add a subject and assign it to a class with a coefficient." />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="font-medium text-slate-800">
                  {s.name}
                  {s.nameFr && <span className="ml-2 text-xs text-slate-400">{s.nameFr}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.assignedClasses.length === 0 ? (
                    <span className="text-xs text-slate-400">Not assigned to any class</span>
                  ) : (
                    s.assignedClasses.map((a) => (
                      <span key={a.classId} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                        {a.className} · coef. {a.coefficient}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => setFormSubject(s)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(s)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formSubject !== undefined && (
        <SubjectFormModal
          subject={formSubject}
          classes={classes}
          onClose={() => setFormSubject(undefined)}
          onSaved={() => {
            setFormSubject(undefined)
            load()
          }}
        />
      )}
    </div>
  )
}

function SubjectFormModal({
  subject,
  classes,
  onClose,
  onSaved
}: {
  subject?: Subject | null
  classes: SchoolClass[]
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const isEdit = !!subject
  const [name, setName] = useState(subject?.name ?? '')
  const [nameFr, setNameFr] = useState(subject?.nameFr ?? '')
  const [classId, setClassId] = useState<number | ''>(classes[0]?.id ?? '')
  const [coefficient, setCoefficient] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    let res
    if (isEdit) {
      res = await window.api.subjects.update({ id: subject!.id, name, nameFr })
    } else {
      if (!classId) {
        setSubmitting(false)
        return setError('Please choose the class this subject belongs to.')
      }
      res = await window.api.subjects.create({ name, nameFr, classId: Number(classId), coefficient })
    }
    setSubmitting(false)
    if (!res.ok) return setError(res.error ?? 'Failed to save subject.')
    onSaved()
  }

  return (
    <Modal title={isEdit ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label-field">Name (English)</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label-field">Name (French, optional)</label>
          <input className="input-field" value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
        </div>

        {!isEdit && (
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3">
            <div>
              <label className="label-field">Class</label>
              {classes.length === 0 ? (
                <p className="text-xs text-red-500">Create a class first.</p>
              ) : (
                <select className="input-field" value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="label-field">Coefficient</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="input-field"
                value={coefficient}
                onChange={(e) => setCoefficient(Number(e.target.value))}
              />
            </div>
          </div>
        )}
        {isEdit && (
          <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            To change which classes use this subject or its coefficient, use the <strong>Subjects</strong> button on a
            class in the Classes screen.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || (!isEdit && classes.length === 0)}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
