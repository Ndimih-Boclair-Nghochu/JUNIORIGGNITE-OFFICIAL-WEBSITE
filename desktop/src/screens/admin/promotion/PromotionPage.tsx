import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Loader2, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import type { SchoolClass, Term, PromotionPreview } from '@shared/types'

/**
 * End-of-year promotion, done class by class. The admin enters the promotion
 * average for the run, every class in the school is offered as a destination,
 * and pupils below the average can still be ticked and promoted deliberately.
 * Promoted pupils are marked PROMOTED on their report card.
 */
export default function PromotionPage(): JSX.Element {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classId, setClassId] = useState<number | null>(null)
  const [basis, setBasis] = useState<'annual' | number>('annual')
  /** '' means "not typed yet" — seeded from the school default on first load. */
  const [avg, setAvg] = useState<number | ''>('')
  const [preview, setPreview] = useState<PromotionPreview | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [dest, setDest] = useState<number | 'graduate' | null>(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const [c, t] = await Promise.all([window.api.classes.list(), window.api.terms.list()])
      if (c.ok) {
        setClasses(c.data ?? [])
        setClassId(c.data?.[0]?.id ?? null)
      }
      if (t.ok) setTerms(t.data ?? [])
    })()
  }, [])

  const load = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    setDone(null)
    const res = await window.api.promotion.preview({
      classId,
      termId: basis === 'annual' ? null : basis,
      promotionAverage: avg === '' ? undefined : Number(avg)
    })
    setLoading(false)
    if (!res.ok || !res.data) {
      setPreview(null)
      return
    }
    setPreview(res.data)
    if (avg === '') setAvg(res.data.promotionAverage) // seed the box with the school default
    setSelected(new Set(res.data.candidates.filter((c) => c.eligible).map((c) => c.studentId)))
    setDest(res.data.suggestedClassId ?? res.data.targetClasses[0]?.id ?? null)
  }, [classId, basis, avg])

  // Debounced so typing an average doesn't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  function toggle(studentId: number): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const graduating = dest === 'graduate'
  const belowSelected = preview ? preview.candidates.filter((c) => selected.has(c.studentId) && !c.eligible).length : 0

  async function handlePromote(): Promise<void> {
    if (!preview || selected.size === 0 || dest === null) return
    const target = preview.targetClasses.find((c) => c.id === dest)
    const msg = graduating
      ? `Graduate ${selected.size} pupil(s)? They will be marked as graduated and leave the school.`
      : `Promote ${selected.size} pupil(s) into ${target?.name ?? 'the selected class'}?` +
        (belowSelected > 0 ? `\n\n${belowSelected} of them are below the promotion average of ${avg}.` : '')
    if (!confirm(msg)) return

    setRunning(true)
    const res = await window.api.promotion.run({
      studentIds: [...selected],
      toClassId: graduating ? null : (dest as number),
      graduate: graduating,
      termId: basis === 'annual' ? null : basis
    })
    setRunning(false)
    if (!res.ok) return alert(res.error)
    setDone(
      `${res.data?.promoted ?? 0} pupil(s) ${graduating ? 'graduated' : `promoted to ${target?.name ?? ''}`}. Their report cards now show PROMOTED.`
    )
    load()
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Promotion</h1>

      {/* Step 1 — choose the class, the basis and the pass mark */}
      <div className="card mb-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label-field">Promote from class</label>
            <select className="input-field" value={classId ?? ''} onChange={(e) => setClassId(Number(e.target.value))}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.levelName ? ` · ${c.levelName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Average based on</label>
            <select
              className="input-field"
              value={basis === 'annual' ? 'annual' : String(basis)}
              onChange={(e) => setBasis(e.target.value === 'annual' ? 'annual' : Number(e.target.value))}
            >
              <option value="annual">Annual average (all terms)</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} only
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Promotion average (out of 20)</label>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              className="input-field"
              value={avg}
              onChange={(e) => setAvg(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {done && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          <CheckCircle2 className="h-4 w-4" />
          {done}
        </div>
      )}

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : !preview ? (
        <EmptyState icon={GraduationCap} title="Select a class to begin" />
      ) : (
        <>
          {/* Step 2 — choose where the selected pupils go */}
          <div className="card mb-5">
            <label className="label-field">Promote selected pupils to</label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="input-field w-72"
                value={dest === 'graduate' ? 'graduate' : (dest ?? '')}
                onChange={(e) => setDest(e.target.value === 'graduate' ? 'graduate' : Number(e.target.value))}
              >
                {preview.targetClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.levelName ? ` · ${c.levelName}` : ''} ({c.studentCount}/{c.capacity})
                  </option>
                ))}
                <option value="graduate">— Graduate (leave school) —</option>
              </select>

              {preview.nextLevel && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  Suggested next level: <span className="font-medium text-slate-700">{preview.nextLevel.name}</span>
                </span>
              )}
            </div>
          </div>

          {preview.candidates.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No pupils in this class" />
          ) : (
            <div className="card p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 text-sm">
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-900">{selected.size}</span> of {preview.candidates.length}{' '}
                  selected
                  {belowSelected > 0 && <span className="ml-2 text-amber-700">({belowSelected} below the average)</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-sm font-medium text-brand-600 hover:underline"
                    onClick={() => setSelected(new Set(preview.candidates.filter((c) => c.eligible).map((c) => c.studentId)))}
                  >
                    Select eligible
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    className="text-sm font-medium text-brand-600 hover:underline"
                    onClick={() => setSelected(new Set(preview.candidates.map((c) => c.studentId)))}
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">·</span>
                  <button className="text-sm font-medium text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {preview.candidates.map((c) => (
                  <label key={c.studentId} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selected.has(c.studentId)}
                      onChange={() => toggle(c.studentId)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800">{c.name}</div>
                      <div className="font-mono text-xs text-slate-400">{c.admissionNo}</div>
                    </div>
                    <div className="w-20 text-right font-semibold text-slate-900">
                      {c.average !== null ? c.average.toFixed(2) : '—'}
                    </div>
                    <span
                      className={
                        'w-28 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold ' +
                        (c.eligible ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700')
                      }
                    >
                      {c.average === null ? 'No marks' : c.eligible ? 'Eligible' : 'Below average'}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end border-t border-slate-100 px-5 py-4">
                <button className="btn-primary" onClick={handlePromote} disabled={running || selected.size === 0 || dest === null}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                  {graduating ? `Graduate ${selected.size} pupil(s)` : `Promote ${selected.size} pupil(s)`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
