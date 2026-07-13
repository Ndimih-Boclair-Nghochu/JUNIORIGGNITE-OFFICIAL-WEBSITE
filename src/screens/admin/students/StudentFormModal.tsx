import { useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import type { Student, SchoolClass } from '@shared/types'

export function StudentFormModal({
  student,
  classes,
  defaultClassId,
  onClose,
  onSaved
}: {
  student?: Student | null
  classes: SchoolClass[]
  defaultClassId?: number
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const [form, setForm] = useState({
    admissionNo: student?.admissionNo ?? '',
    firstName: student?.firstName ?? '',
    lastName: student?.lastName ?? '',
    dob: student?.dob ?? '',
    gender: student?.gender ?? 'male',
    classId: student?.classId ?? defaultClassId ?? classes[0]?.id ?? 0,
    parentName: student?.parentName ?? '',
    parentPhone: student?.parentPhone ?? '',
    parentEmail: student?.parentEmail ?? '',
    emergencyContact: student?.emergencyContact ?? '',
    medicalNotes: student?.medicalNotes ?? '',
    previousSchool: student?.previousSchool ?? '',
    photoPath: student?.photoPath ?? null as string | null
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
    const res = student
      ? await window.api.students.update({ id: student.id, ...form })
      : await window.api.students.create(form)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Failed to save student.')
      return
    }
    onSaved()
  }

  return (
    <Modal title={student ? 'Edit student' : 'Register student'} onClose={onClose} widthClassName="max-w-2xl">
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
            <label className="label-field">Admission No.</label>
            <input
              className="input-field"
              placeholder="Auto-generated if blank"
              value={form.admissionNo}
              onChange={(e) => update('admissionNo', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Class</label>
            <select
              className="input-field"
              value={form.classId}
              onChange={(e) => update('classId', Number(e.target.value))}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">First name</label>
            <input className="input-field" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
          </div>
          <div>
            <label className="label-field">Last name</label>
            <input className="input-field" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
          </div>
          <div>
            <label className="label-field">Date of birth</label>
            <input type="date" className="input-field" value={form.dob ?? ''} onChange={(e) => update('dob', e.target.value)} />
          </div>
          <div>
            <label className="label-field">Gender</label>
            <select className="input-field" value={form.gender} onChange={(e) => update('gender', e.target.value as any)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="label-field">Parent / guardian name</label>
            <input className="input-field" value={form.parentName ?? ''} onChange={(e) => update('parentName', e.target.value)} />
          </div>
          <div>
            <label className="label-field">Parent / guardian phone</label>
            <input className="input-field" value={form.parentPhone ?? ''} onChange={(e) => update('parentPhone', e.target.value)} />
          </div>
          <div>
            <label className="label-field">Parent email (optional)</label>
            <input className="input-field" value={form.parentEmail ?? ''} onChange={(e) => update('parentEmail', e.target.value)} />
          </div>
          <div>
            <label className="label-field">Emergency contact</label>
            <input
              className="input-field"
              value={form.emergencyContact ?? ''}
              onChange={(e) => update('emergencyContact', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label-field">Previous school (optional)</label>
            <input
              className="input-field"
              value={form.previousSchool ?? ''}
              onChange={(e) => update('previousSchool', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label-field">Medical notes (optional)</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.medicalNotes ?? ''}
              onChange={(e) => update('medicalNotes', e.target.value)}
            />
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
