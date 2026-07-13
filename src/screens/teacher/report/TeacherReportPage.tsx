import { useEffect, useState } from 'react'
import { FileBadge, Loader2, FileDown } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { EmptyState } from '../../../components/EmptyState'
import type { Term, Student } from '@shared/types'

export default function TeacherReportPage(): JSX.Element {
  const session = useAuthStore((s) => s.session)
  const [terms, setTerms] = useState<Term[]>([])
  const [termId, setTermId] = useState<number | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const [t, s] = await Promise.all([window.api.terms.list(), window.api.students.list({})])
      if (t.ok) {
        setTerms(t.data ?? [])
        setTermId(t.data?.find((x) => x.isCurrent)?.id ?? t.data?.[0]?.id ?? null)
      }
      if (s.ok) setStudents(s.data ?? [])
      setLoading(false)
    })()
  }, [])

  async function handleGenerate(student: Student): Promise<void> {
    if (!termId) return
    setGeneratingId(student.id)
    const res = await window.api.reportCards.generate({ studentId: student.id, termId })
    setGeneratingId(null)
    if (!res.ok) alert(res.error)
  }

  if (session?.role !== 'teacher') return <></>

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Report Cards — {session.className}</h1>
        <select className="input-field w-48" value={termId ?? ''} onChange={(e) => setTermId(Number(e.target.value))}>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
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
              <button className="btn-primary" onClick={() => handleGenerate(s)} disabled={generatingId === s.id}>
                {generatingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Preview report
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
