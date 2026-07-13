import { useEffect, useState } from 'react'
import { Wallet, Loader2, Receipt, Plus, Settings2 } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { Modal } from '../../../components/Modal'
import type { SchoolClass, Term, FeeMethod } from '@shared/types'

interface FeeRow {
  studentId: number
  studentName: string
  admissionNo: string
  className: string
  expected: number
  paid: number
  balance: number
  payments: { id: number; amount: number; method: FeeMethod; reference: string | null; paidAt: string }[]
}

const fmt = new Intl.NumberFormat('en').format

export default function FeesPage(): JSX.Element {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classId, setClassId] = useState<number | 'all'>('all')
  const [termId, setTermId] = useState<number | null>(null)
  const [rows, setRows] = useState<FeeRow[]>([])
  const [totals, setTotals] = useState<{ totalExpected: number; totalCollected: number; totalOutstanding: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [payFor, setPayFor] = useState<FeeRow | null>(null)
  const [structureFor, setStructureFor] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [c, t] = await Promise.all([window.api.classes.list(), window.api.terms.list()])
      if (c.ok) setClasses(c.data ?? [])
      if (t.ok) {
        setTerms(t.data ?? [])
        setTermId(t.data?.find((x) => x.isCurrent)?.id ?? t.data?.[0]?.id ?? null)
      }
    })()
  }, [])

  async function load(): Promise<void> {
    if (!termId) return
    setLoading(true)
    const [p, b] = await Promise.all([
      window.api.fees.listPayments({ termId, classId: classId === 'all' ? undefined : classId }),
      window.api.fees.balance({ termId })
    ])
    if (p.ok) setRows(p.data ?? [])
    if (b.ok) setTotals(b.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, classId])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Fee Management</h1>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => setStructureFor(true)}>
            <Settings2 className="h-4 w-4" />
            Fee structure
          </button>
          <select className="input-field w-44" value={termId ?? ''} onChange={(e) => setTermId(Number(e.target.value))}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className="input-field w-48"
            value={classId}
            onChange={(e) => setClassId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {totals && (
        <div className="mb-6 grid grid-cols-3 gap-5">
          <div className="card">
            <div className="text-sm text-slate-500">Expected</div>
            <div className="text-xl font-bold text-slate-900">{fmt(totals.totalExpected)} FCFA</div>
          </div>
          <div className="card">
            <div className="text-sm text-slate-500">Collected</div>
            <div className="text-xl font-bold text-brand-600">{fmt(totals.totalCollected)} FCFA</div>
          </div>
          <div className="card">
            <div className="text-sm text-slate-500">Outstanding</div>
            <div className="text-xl font-bold text-red-600">{fmt(totals.totalOutstanding)} FCFA</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card h-64 animate-pulse bg-slate-100" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title="No students / fees for this selection" />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3 text-right">Expected</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-5 py-3 font-medium text-slate-800">{r.studentName}</td>
                  <td className="px-5 py-3 text-slate-500">{r.className}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{fmt(r.expected)}</td>
                  <td className="px-5 py-3 text-right text-brand-600">{fmt(r.paid)}</td>
                  <td className={'px-5 py-3 text-right font-medium ' + (r.balance > 0 ? 'text-red-600' : 'text-slate-400')}>
                    {fmt(r.balance)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="btn-secondary" onClick={() => setPayFor(r)}>
                      <Plus className="h-4 w-4" />
                      Record payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payFor && termId && (
        <PaymentModal
          row={payFor}
          termId={termId}
          onClose={() => setPayFor(null)}
          onDone={() => {
            setPayFor(null)
            load()
          }}
        />
      )}
      {structureFor && termId && (
        <StructureModal classes={classes} termId={termId} onClose={() => setStructureFor(false)} onDone={() => { setStructureFor(false); load() }} />
      )}
    </div>
  )
}

function PaymentModal({
  row,
  termId,
  onClose,
  onDone
}: {
  row: FeeRow
  termId: number
  onClose: () => void
  onDone: () => void
}): JSX.Element {
  const [amount, setAmount] = useState<number>(row.balance || 0)
  const [method, setMethod] = useState<FeeMethod>('momo')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await window.api.fees.recordPayment({ studentId: row.studentId, termId, amount, method, reference })
    if (!res.ok) {
      setSaving(false)
      return setError(res.error ?? 'Failed to record payment.')
    }
    // Offer to print the receipt immediately.
    if (res.data?.paymentId) await window.api.fees.generateReceipt({ paymentId: res.data.paymentId })
    setSaving(false)
    onDone()
  }

  return (
    <Modal title={`Record payment — ${row.studentName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
          Balance: <span className="font-semibold text-slate-800">{fmt(row.balance)} FCFA</span>
        </div>
        <div>
          <label className="label-field">Amount (FCFA) — supports partial / installment</label>
          <input type="number" min={0} className="input-field" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
        </div>
        <div>
          <label className="label-field">Payment method</label>
          <select className="input-field" value={method} onChange={(e) => setMethod(e.target.value as FeeMethod)}>
            <option value="momo">MTN Mobile Money</option>
            <option value="orange">Orange Money</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label-field">
            {method === 'other' ? 'Reference (optional)' : 'Mobile Money reference'}
          </label>
          <input className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Record & print receipt
          </button>
        </div>
      </form>
    </Modal>
  )
}

function StructureModal({
  classes,
  termId,
  onClose,
  onDone
}: {
  classes: SchoolClass[]
  termId: number
  onClose: () => void
  onDone: () => void
}): JSX.Element {
  const [classId, setClassId] = useState<number>(classes[0]?.id ?? 0)
  const [amount, setAmount] = useState<number>(0)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await window.api.fees.listStructures({ termId })
      if (res.ok) {
        const existing = res.data?.find((s) => s.classId === classId)
        setAmount(existing?.amount ?? 0)
        setDescription(existing?.description ?? '')
      }
    })()
  }, [classId, termId])

  async function handleSave(): Promise<void> {
    setSaving(true)
    await window.api.fees.saveStructure({ classId, termId, amount, description })
    setSaving(false)
    onDone()
  }

  return (
    <Modal title="Fee structure (per class / term)" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label-field">Class</label>
          <select className="input-field" value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Amount (FCFA)</label>
          <input type="number" min={0} className="input-field" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="label-field">Description (optional)</label>
          <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} />
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
    </Modal>
  )
}
