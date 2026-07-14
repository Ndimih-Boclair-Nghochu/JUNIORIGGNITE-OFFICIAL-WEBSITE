import { useEffect, useState } from 'react'
import { IdCard, Loader2, FileDown } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import type { SchoolClass, Student } from '@shared/types'

export default function IdCardsPage(): JSX.Element {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classId, setClassId] = useState<number | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [format, setFormat] = useState<'paper' | 'pvc'>('paper')
  const [loading, setLoading] = useState(false)
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const c = await window.api.classes.list()
      if (c.ok) {
        setClasses(c.data ?? [])
        setClassId(c.data?.[0]?.id ?? null)
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
    setGeneratingId(student.id)
    const res = await window.api.idCards.generate({ studentId: student.id, format })
    setGeneratingId(null)
    if (!res.ok) alert(res.error)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">ID Cards</h1>
        <div className="flex gap-3">
          <select className="input-field w-44" value={format} onChange={(e) => setFormat(e.target.value as any)}>
            <option value="paper">Paper (laminate)</option>
            <option value="pvc">PVC card (CR80)</option>
          </select>
          <select className="input-field w-56" value={classId ?? ''} onChange={(e) => setClassId(Number(e.target.value))}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : students.length === 0 ? (
        <EmptyState icon={IdCard} title="No students in this class" />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                  {s.photoPath ? (
                    <img src={`file:///${s.photoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
                  ) : (
                    `${s.firstName[0]}${s.lastName[0]}`
                  )}
                </div>
                <div className="font-medium text-slate-800">
                  {s.firstName} {s.lastName}
                  <span className="ml-2 font-mono text-xs text-slate-400">{s.admissionNo}</span>
                </div>
              </div>
              <button className="btn-primary" onClick={() => handleGenerate(s)} disabled={generatingId === s.id}>
                {generatingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Generate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
