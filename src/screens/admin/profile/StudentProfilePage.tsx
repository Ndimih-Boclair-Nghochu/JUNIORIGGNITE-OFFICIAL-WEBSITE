import { useEffect, useMemo, useState } from 'react'
import { BookMarked, Search, Loader2, FileText, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { useAppStore } from '../../../store/appStore'
import type { Student, SchoolClass } from '@shared/types'

export default function StudentProfilePage(): JSX.Element {
  const school = useAppStore((s) => s.school)
  const refreshApp = useAppStore((s) => s.refresh)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classFilter, setClassFilter] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  // Cover details (persisted on the school record)
  const [coverOpen, setCoverOpen] = useState(false)
  const [about, setAbout] = useState('')
  const [poBox, setPoBox] = useState('')
  const [village, setVillage] = useState('')
  const [savingCover, setSavingCover] = useState(false)
  const [savedCover, setSavedCover] = useState(false)

  async function load(): Promise<void> {
    setLoading(true)
    const [s, c] = await Promise.all([window.api.students.list({}), window.api.classes.list()])
    if (s.ok) setStudents(s.data ?? [])
    if (c.ok) setClasses(c.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setAbout(school?.aboutText ?? '')
    setPoBox(school?.poBox ?? '')
    setVillage(school?.villageTown ?? '')
  }, [school])

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        if (classFilter !== 'all' && s.classId !== classFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            s.firstName.toLowerCase().includes(q) ||
            s.lastName.toLowerCase().includes(q) ||
            s.admissionNo.toLowerCase().includes(q)
          )
        }
        return true
      }),
    [students, classFilter, search]
  )

  async function saveCover(): Promise<void> {
    setSavingCover(true)
    const res = await window.api.settings.update({ aboutText: about, poBox, villageTown: village })
    setSavingCover(false)
    if (res.ok) {
      await refreshApp()
      setSavedCover(true)
      setTimeout(() => setSavedCover(false), 2000)
    }
  }

  async function generate(student: Student): Promise<void> {
    setBusyId(student.id)
    const res = await window.api.studentProfiles.generate({ studentId: student.id })
    setBusyId(null)
    if (!res.ok) alert(res.error)
  }

  return (
    <div className="p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Student Profiles</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Generate a printable profile cover for each student — an official report-card folder that printed
        report cards are slipped into after printing.
      </p>

      {/* Cover details editor */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          className="flex w-full items-center justify-between px-5 py-4 text-left"
          onClick={() => setCoverOpen((v) => !v)}
        >
          <div>
            <div className="font-semibold text-slate-800">Cover details</div>
            <div className="text-xs text-slate-500">
              Shown on every profile cover — the school blurb, postal box and village/town.
            </div>
          </div>
          {coverOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        {coverOpen && (
          <div className="space-y-4 border-t border-slate-100 p-5">
            <div>
              <label className="label-field">About the school</label>
              <textarea
                className="input-field min-h-[90px] resize-y"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder={`${school?.name ?? 'The school'} is dedicated to academic excellence…`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">P.O. Box</label>
                <input className="input-field" value={poBox} onChange={(e) => setPoBox(e.target.value)} placeholder="1234" />
              </div>
              <div>
                <label className="label-field">Village / Town</label>
                <input className="input-field" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Yaoundé" />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={saveCover} disabled={savingCover}>
                {savingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savedCover ? 'Saved' : 'Save cover details'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or admission number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-56"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookMarked} title="No students found" description="Adjust the filters or register students first." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="card flex items-center gap-4 !p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {s.photoPath ? (
                  <img src={`file:///${s.photoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-slate-300">
                    {s.firstName[0]}
                    {s.lastName[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-800">
                  {s.firstName} {s.lastName}
                </div>
                <div className="font-mono text-xs text-slate-400">{s.admissionNo}</div>
                <div className="text-xs text-slate-400">{s.className ?? '—'}</div>
              </div>
              <button className="btn-primary shrink-0 !px-3 !py-2 text-sm" onClick={() => generate(s)} disabled={busyId === s.id}>
                {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Generate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
