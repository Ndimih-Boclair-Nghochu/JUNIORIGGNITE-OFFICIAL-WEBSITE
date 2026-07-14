import { useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import type { Teacher } from '@shared/types'

export function TeacherFormModal({
  teacher,
  onClose,
  onSaved
}: {
  teacher?: Teacher | null
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const [form, setForm] = useState({
    firstName: teacher?.firstName ?? '',
    lastName: teacher?.lastName ?? '',
    phone: teacher?.phone ?? '',
    email: teacher?.email ?? '',
    qualifications: teacher?.qualifications ?? '',
    employmentDate: teacher?.employmentDate ?? '',
    status: teacher?.status ?? 'active',
    photoPath: teacher?.photoPath ?? (null as string | null)
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]): void {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handlePickPhoto(): Promise<void> {
    const res = await window.api.files.pickImage()
    if (res.ok && res.data?.path) update('photoPath', res.data.path)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = teacher ? await window.api.teachers.update({ id: teacher.id, ...form }) : await window.api.teachers.create(form)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Failed to save teacher.')
      return
    }
    onSaved()
  }

  return (
    <Modal title={teacher ? 'Edit teacher' : 'Add teacher'} onClose={onClose} widthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            {form.photoPath ? (
              <img src={`file:///${form.photoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-slate-300" />
            )}
          </div>
          <button type="button" className="btn-secondary" onClick={handlePickPhoto}>
            Upload photo
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">First name</label>
            <input className="input-field" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
          </div>
          <div>
            <label className="label-field">Last name</label>
            <input className="input-field" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
          </div>
          <div>
            <label className="label-field">Phone</label>
            <input className="input-field" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input className="input-field" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label-field">Qualifications</label>
            <input
              className="input-field"
              value={form.qualifications ?? ''}
              onChange={(e) => update('qualifications', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Employment date</label>
            <input
              type="date"
              className="input-field"
              value={form.employmentDate ?? ''}
              onChange={(e) => update('employmentDate', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => update('status', e.target.value as any)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
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
