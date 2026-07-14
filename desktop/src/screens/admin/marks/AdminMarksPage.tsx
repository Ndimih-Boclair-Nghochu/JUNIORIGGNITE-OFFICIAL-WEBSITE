import { useEffect, useState } from 'react'
import { MarksBoard } from '../../shared/MarksBoard'
import type { SchoolClass, Term } from '@shared/types'

export default function AdminMarksPage(): JSX.Element {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classId, setClassId] = useState<number | null>(null)
  const [termId, setTermId] = useState<number | null>(null)

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

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Marks</h1>
        <div className="flex gap-3">
          <select className="input-field w-48" value={termId ?? ''} onChange={(e) => setTermId(Number(e.target.value))}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
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
      {classId && termId && <MarksBoard classId={classId} termId={termId} canPublish />}
    </div>
  )
}
