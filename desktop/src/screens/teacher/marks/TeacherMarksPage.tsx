import { useEffect, useState } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { MarksBoard } from '../../shared/MarksBoard'
import type { Term } from '@shared/types'

export default function TeacherMarksPage(): JSX.Element {
  const session = useAuthStore((s) => s.session)
  const [terms, setTerms] = useState<Term[]>([])
  const [termId, setTermId] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.terms.list()
      if (res.ok) {
        setTerms(res.data ?? [])
        setTermId(res.data?.find((t) => t.isCurrent)?.id ?? res.data?.[0]?.id ?? null)
      }
    })()
  }, [])

  if (session?.role !== 'teacher') return <></>

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Marks — {session.className}</h1>
        <select className="input-field w-48" value={termId ?? ''} onChange={(e) => setTermId(Number(e.target.value))}>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {termId && <MarksBoard classId={session.classId} termId={termId} canPublish={false} />}
    </div>
  )
}
