import { Fragment, useEffect, useState } from 'react'
import { Loader2, NotebookPen, CheckCircle2 } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import type { StudentResult } from '@shared/types'

export function MarksBoard({
  classId,
  termId,
  canPublish
}: {
  classId: number
  termId: number
  canPublish: boolean
}): JSX.Element {
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    const res = await window.api.marks.getForClass({ classId, termId })
    if (res.ok) setResults(res.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, termId])

  const subjectColumns = results[0]?.subjectResults.map((s) => ({ subjectId: s.subjectId, subjectName: s.subjectName })) ?? []

  async function handleChange(
    studentId: number,
    subjectId: number,
    field: 'caMark' | 'examMark',
    value: string
  ): Promise<void> {
    const numeric = value === '' ? null : Math.max(0, Math.min(20, Number(value)))
    setResults((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? {
              ...r,
              subjectResults: r.subjectResults.map((s) => (s.subjectId === subjectId ? { ...s, [field]: numeric } : s))
            }
          : r
      )
    )
    const key = `${studentId}:${subjectId}`
    setSavingKey(key)
    const student = results.find((r) => r.studentId === studentId)
    const subject = student?.subjectResults.find((s) => s.subjectId === subjectId)
    const caMark = field === 'caMark' ? numeric : subject?.caMark ?? null
    const examMark = field === 'examMark' ? numeric : subject?.examMark ?? null
    const res = await window.api.marks.save({ studentId, subjectId, classId, termId, caMark, examMark })
    if (!res.ok) setError(res.error ?? 'Failed to save mark.')
    setSavingKey(null)
    load()
  }

  async function handlePublish(): Promise<void> {
    if (!confirm('Publish results for this class and term? Marks will be locked from further editing.')) return
    setPublishing(true)
    const res = await window.api.marks.publish({ classId, termId })
    setPublishing(false)
    if (!res.ok) return setError(res.error ?? 'Failed to publish.')
    load()
  }

  if (loading) return <div className="card h-64 animate-pulse bg-slate-100" />
  if (results.length === 0) return <EmptyState icon={NotebookPen} title="No students in this class" />

  return (
    <div>
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {canPublish && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary" onClick={handlePublish} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Publish results
          </button>
        </div>
      )}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left">Student</th>
              {subjectColumns.map((s) => (
                <th key={s.subjectId} className="px-3 py-3 text-center" colSpan={2}>
                  {s.subjectName}
                </th>
              ))}
              <th className="px-3 py-3 text-center">Average</th>
              <th className="px-3 py-3 text-center">Rank</th>
              <th className="px-3 py-3 text-center">Grade</th>
            </tr>
            <tr>
              <th className="sticky left-0 bg-slate-50 px-4 py-1" />
              {subjectColumns.map((s) => (
                <Fragment key={s.subjectId}>
                  <th className="px-2 py-1 text-center text-[10px] font-normal">CA</th>
                  <th className="px-2 py-1 text-center text-[10px] font-normal">Exam</th>
                </Fragment>
              ))}
              <th colSpan={3} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r) => (
              <tr key={r.studentId}>
                <td className="sticky left-0 bg-white px-4 py-2 font-medium text-slate-800">
                  {r.firstName} {r.lastName}
                </td>
                {r.subjectResults.map((s) => {
                  const keyCa = `${r.studentId}:${s.subjectId}`
                  return (
                    <Fragment key={keyCa}>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm focus:border-brand-500 focus:outline-none"
                          value={s.caMark ?? ''}
                          disabled={savingKey === keyCa}
                          onChange={(e) => handleChange(r.studentId, s.subjectId, 'caMark', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm focus:border-brand-500 focus:outline-none"
                          value={s.examMark ?? ''}
                          disabled={savingKey === keyCa}
                          onChange={(e) => handleChange(r.studentId, s.subjectId, 'examMark', e.target.value)}
                        />
                      </td>
                    </Fragment>
                  )
                })}
                <td className="px-3 py-2 text-center font-semibold text-slate-800">{r.overallAverage ?? '—'}</td>
                <td className="px-3 py-2 text-center text-slate-500">{r.overallRank ?? '—'}</td>
                <td className="px-3 py-2 text-center">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{r.grade}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
