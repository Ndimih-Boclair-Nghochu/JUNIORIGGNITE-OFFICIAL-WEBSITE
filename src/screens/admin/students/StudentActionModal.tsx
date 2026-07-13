import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import type { Student, SchoolClass } from '@shared/types'

export type StudentAction = 'promote' | 'transfer' | 'withdraw' | 'graduate' | 'markRepeating'

const TITLES: Record<StudentAction, string> = {
  promote: 'Promote student',
  transfer: 'Transfer student',
  withdraw: 'Withdraw student',
  graduate: 'Graduate student',
  markRepeating: 'Mark as repeating (redoublant)'
}

export function StudentActionModal({
  student,
  action,
  classes,
  onClose,
  onDone
}: {
  student: Student
  action: StudentAction
  classes: SchoolClass[]
  onClose: () => void
  onDone: () => void
}): JSX.Element {
  const needsClass = action === 'promote' || action === 'transfer'
  const [toClassId, setToClassId] = useState<number>(classes.find((c) => c.id !== student.classId)?.id ?? classes[0]?.id ?? 0)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload = needsClass
      ? { studentId: student.id, toClassId, notes }
      : { studentId: student.id, notes }
    const res = await (window.api.students[action] as any)(payload)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Action failed.')
      return
    }
    onDone()
  }

  return (
    <Modal title={`${TITLES[action]} — ${student.firstName} ${student.lastName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        {needsClass && (
          <div>
            <label className="label-field">{action === 'promote' ? 'Promote to class' : 'Transfer to class'}</label>
            <select className="input-field" value={toClassId} onChange={(e) => setToClassId(Number(e.target.value))}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label-field">Notes (optional)</label>
          <textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </form>
    </Modal>
  )
}
