import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import type { SchoolClass, Teacher, Subsystem, ClassLevel } from '@shared/types'

export function ClassFormModal({
  schoolClass,
  teachers,
  onClose,
  onSaved
}: {
  schoolClass?: SchoolClass | null
  teachers: Teacher[]
  onClose: () => void
  onSaved: (accessCode?: string) => void
}): JSX.Element {
  const [levels, setLevels] = useState<ClassLevel[]>([])
  const [addingLevel, setAddingLevel] = useState(false)
  const [newLevel, setNewLevel] = useState('')
  const [form, setForm] = useState({
    name: schoolClass?.name ?? '',
    subsystem: (schoolClass?.subsystem ?? 'anglophone') as Subsystem,
    capacity: schoolClass?.capacity ?? 40,
    classTeacherId: schoolClass?.classTeacherId ?? (null as number | null),
    levelId: schoolClass?.levelId ?? (null as number | null)
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadLevels(selectId?: number): Promise<void> {
    const res = await window.api.classLevels.list()
    if (res.ok) {
      const list = res.data ?? []
      setLevels(list)
      setForm((f) => ({ ...f, levelId: selectId ?? f.levelId ?? list[0]?.id ?? null }))
    }
  }

  useEffect(() => {
    loadLevels()
  }, [])

  async function handleAddLevel(): Promise<void> {
    const name = newLevel.trim()
    if (!name) return
    const res = await window.api.classLevels.create({ name })
    if (!res.ok) return setError(res.error ?? 'Failed to add level.')
    setNewLevel('')
    setAddingLevel(false)
    setError(null)
    await loadLevels(res.data?.id)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    if (schoolClass) {
      const res = await window.api.classes.update({ id: schoolClass.id, ...form })
      setSubmitting(false)
      if (!res.ok) return setError(res.error ?? 'Failed to save class.')
      onSaved()
    } else {
      const res = await window.api.classes.create(form)
      setSubmitting(false)
      if (!res.ok) return setError(res.error ?? 'Failed to save class.')
      onSaved(res.data?.accessCode)
    }
  }

  return (
    <Modal title={schoolClass ? 'Edit class' : 'Create class'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {/* Level decides where pupils are promoted to; the name is the stream. */}
        <div>
          <label className="label-field">Class level</label>
          {addingLevel ? (
            <div className="flex gap-2">
              <input
                className="input-field"
                placeholder="e.g. Class One"
                value={newLevel}
                autoFocus
                onChange={(e) => setNewLevel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddLevel()
                  }
                }}
              />
              <button type="button" className="btn-primary shrink-0" onClick={handleAddLevel}>
                Add
              </button>
              <button type="button" className="btn-secondary shrink-0" onClick={() => setAddingLevel(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                className="input-field"
                value={form.levelId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, levelId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">No level</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-secondary shrink-0" onClick={() => setAddingLevel(true)}>
                <Plus className="h-4 w-4" />
                New level
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Pupils in this class are promoted to the level above. Several classes can share one level.
          </p>
        </div>

        <div>
          <label className="label-field">Class name</label>
          <input
            className="input-field"
            placeholder="e.g. Class One A"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label-field">Subsystem</label>
          <select
            className="input-field"
            value={form.subsystem}
            onChange={(e) => setForm((f) => ({ ...f, subsystem: e.target.value as Subsystem }))}
          >
            <option value="anglophone">Anglophone</option>
            <option value="francophone">Francophone</option>
          </select>
        </div>
        <div>
          <label className="label-field">Capacity</label>
          <input
            type="number"
            className="input-field"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="label-field">Class teacher</label>
          <select
            className="input-field"
            value={form.classTeacherId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, classTeacherId: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
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
