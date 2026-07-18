import { useEffect, useState } from 'react'
import { FileBadge, Loader2, FileDown, Pencil, FolderDown } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { Modal } from '../../../components/Modal'
import type { SchoolClass, Term, Student, ReportCardMeta } from '@shared/types'

export default function ReportCardsPage(): JSX.Element {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classId, setClassId] = useState<number | null>(null)
  const [termId, setTermId] = useState<number | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [generatingClass, setGeneratingClass] = useState(false)
  const [metaStudent, setMetaStudent] = useState<Student | null>(null)

  useEffect(() => {
    ;(async () => {
      const [c, t] = await Promise.all([window.api.classes.list(), window.api.terms.list()])
      if (c.ok) {
        setClasses(c.data ?? [])
        setClassId(c.data?.[0]?.id ?? null)
      }
      if (t.ok) {
        setTerms(t.data ?? [])
        setTermId(t.data?.find((x) => x.isCurrent)?.id ?? t.data?.[0]?.id ?? null)
      }
    })()
  }, [])

  useEffect(() => {
    if (!classId) return
    ;(async () => {
      setLoading(true)
      const res = await window.api.students.list({ classId })
      if (res.ok) setStudents(res.data ?? [])
      setLoading(false)
    })()
  }, [classId])

  async function handleGenerate(student: Student): Promise<void> {
    if (!termId) return
    setGeneratingId(student.id)
    const res = await window.api.reportCards.generate({ studentId: student.id, termId })
    setGeneratingId(null)
    if (!res.ok) alert(res.error)
  }

  async function handleGenerateClass(): Promise<void> {
    if (!classId || !termId) return
    setGeneratingClass(true)
    const res = await window.api.reportCards.generateClass({ classId, termId })
    setGeneratingClass(false)
    if (!res.ok) alert(res.error)
    else alert(`Generated ${res.data?.count ?? 0} report cards (one A5 PDF per student). Opening the folder…`)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Report Cards</h1>
        <div className="flex flex-wrap gap-3">
          <select className="input-field w-44" value={termId ?? ''} onChange={(e) => setTermId(Number(e.target.value))}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select className="input-field w-52" value={classId ?? ''} onChange={(e) => setClassId(Number(e.target.value))}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={handleGenerateClass}
            disabled={generatingClass || students.length === 0 || !termId}
            title="Generate a separate A5 PDF report card for every student in this class"
          >
            {generatingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />}
            Generate whole class
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : students.length === 0 ? (
        <EmptyState icon={FileBadge} title="No students in this class" />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div className="font-medium text-slate-800">
                {s.firstName} {s.lastName}
                <span className="ml-2 font-mono text-xs text-slate-400">{s.admissionNo}</span>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setMetaStudent(s)}>
                  <Pencil className="h-4 w-4" />
                  Comments
                </button>
                <button className="btn-primary" onClick={() => handleGenerate(s)} disabled={generatingId === s.id}>
                  {generatingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Generate PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {metaStudent && termId && (
        <ReportMetaModal student={metaStudent} termId={termId} onClose={() => setMetaStudent(null)} />
      )}
    </div>
  )
}

function ReportMetaModal({
  student,
  termId,
  onClose
}: {
  student: Student
  termId: number
  onClose: () => void
}): JSX.Element {
  const [meta, setMeta] = useState<ReportCardMeta | null>(null)
  const [form, setForm] = useState({
    conduct: '',
    teacherComment: '',
    headTeacherComment: '',
    promotionDecision: 'pending' as 'promoted' | 'repeat' | 'pending'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.reportCardMeta.get({ studentId: student.id, termId })
      if (res.ok && res.data) {
        setMeta(res.data)
        setForm({
          conduct: res.data.conduct ?? '',
          teacherComment: res.data.teacherComment ?? '',
          headTeacherComment: res.data.headTeacherComment ?? '',
          promotionDecision: res.data.promotionDecision ?? 'pending'
        })
      }
      setLoading(false)
    })()
  }, [student.id, termId])

  async function handleSave(): Promise<void> {
    setSaving(true)
    await window.api.reportCardMeta.save({ studentId: student.id, termId, ...form })
    setSaving(false)
    onClose()
  }

  return (
    <Modal title={`Report details — ${student.firstName} ${student.lastName}`} onClose={onClose} widthClassName="max-w-lg">
      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label-field">Conduct</label>
            <input className="input-field" value={form.conduct} onChange={(e) => setForm((f) => ({ ...f, conduct: e.target.value }))} />
          </div>
          <div>
            <label className="label-field">Class teacher's comment</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.teacherComment}
              onChange={(e) => setForm((f) => ({ ...f, teacherComment: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-field">Head teacher's comment</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.headTeacherComment}
              onChange={(e) => setForm((f) => ({ ...f, headTeacherComment: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-field">Promotion decision (redoublant handling)</label>
            <select
              className="input-field"
              value={form.promotionDecision}
              onChange={(e) => setForm((f) => ({ ...f, promotionDecision: e.target.value as any }))}
            >
              <option value="pending">Pending</option>
              <option value="promoted">Promoted</option>
              <option value="repeat">To repeat (redoublant)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
