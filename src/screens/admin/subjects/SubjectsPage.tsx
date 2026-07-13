import { useEffect, useState } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { Modal } from '../../../components/Modal'
import type { Subject } from '@shared/types'

export default function SubjectsPage(): JSX.Element {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [formSubject, setFormSubject] = useState<Subject | null | undefined>(undefined)

  async function load(): Promise<void> {
    setLoading(true)
    const res = await window.api.subjects.list()
    if (res.ok) setSubjects(res.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(s: Subject): Promise<void> {
    if (!confirm(`Delete subject ${s.name}?`)) return
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
        <EmptyState icon={BookOpen} title="No subjects yet" description="Add subjects, then assign them to classes." />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="font-medium text-slate-800">{s.name}</div>
                {s.nameFr && <div className="text-xs text-slate-400">{s.nameFr}</div>}
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
  onClose,
  onSaved
}: {
  subject?: Subject | null
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const [name, setName] = useState(subject?.name ?? '')
  const [nameFr, setNameFr] = useState(subject?.nameFr ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = subject
      ? await window.api.subjects.update({ id: subject.id, name, nameFr })
      : await window.api.subjects.create({ name, nameFr })
    setSubmitting(false)
    if (!res.ok) return setError(res.error ?? 'Failed to save subject.')
    onSaved()
  }

  return (
    <Modal title={subject ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label-field">Name (English)</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label-field">Name (French, optional)</label>
          <input className="input-field" value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
