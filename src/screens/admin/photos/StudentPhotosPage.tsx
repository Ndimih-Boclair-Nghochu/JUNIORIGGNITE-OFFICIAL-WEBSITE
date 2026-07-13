import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Camera, Search, Loader2, Check } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import type { Student, SchoolClass } from '@shared/types'

export default function StudentPhotosPage(): JSX.Element {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classFilter, setClassFilter] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [justSavedId, setJustSavedId] = useState<number | null>(null)

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

  const filtered = useMemo(() => {
    return students.filter((s) => {
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
    })
  }, [students, classFilter, search])

  async function handleUpload(student: Student): Promise<void> {
    const picked = await window.api.files.pickImage()
    if (!picked.ok || !picked.data?.path) return
    setUploadingId(student.id)
    const res = await window.api.students.update({ id: student.id, photoPath: picked.data.path })
    setUploadingId(null)
    if (res.ok && res.data) {
      setStudents((prev) => prev.map((s) => (s.id === student.id ? res.data! : s)))
      setJustSavedId(student.id)
      setTimeout(() => setJustSavedId((id) => (id === student.id ? null : id)), 1800)
    } else if (!res.ok) {
      alert(res.error)
    }
  }

  const withPhoto = students.filter((s) => s.photoPath).length

  return (
    <div className="p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Student Photos</h1>
        <div className="text-sm text-slate-500">
          {withPhoto} / {students.length} have a photo
        </div>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Photos uploaded here appear on the student's profile, ID card and report card.
      </p>

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
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card h-56 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Camera} title="No students found" description="Adjust the filters or register students first." />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((s) => (
            <div key={s.id} className="card flex flex-col items-center gap-3 p-4 text-center">
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                {s.photoPath ? (
                  <img src={`file:///${s.photoPath.replace(/\\/g, '/')}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-slate-300">
                    {s.firstName[0]}
                    {s.lastName[0]}
                  </span>
                )}
                {justSavedId === s.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-brand-600/80 text-white">
                    <Check className="h-8 w-8" />
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {s.firstName} {s.lastName}
                </div>
                <div className="font-mono text-xs text-slate-400">{s.admissionNo}</div>
                <div className="text-xs text-slate-400">{s.className ?? '—'}</div>
              </div>
              <button
                className="btn-secondary w-full !py-2 text-sm"
                onClick={() => handleUpload(s)}
                disabled={uploadingId === s.id}
              >
                {uploadingId === s.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {s.photoPath ? 'Change' : 'Upload'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
