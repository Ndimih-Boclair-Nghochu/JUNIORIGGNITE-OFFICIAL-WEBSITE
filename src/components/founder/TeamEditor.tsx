import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Trash2, Eye, EyeOff, ImagePlus, Users, GripVertical, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { TeamMember } from '@/lib/types'

/** Downscales a chosen image to a small square JPEG data URL for the JSON store. */
function resizeToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no canvas'))
      // cover-crop to a square
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('bad image'))
    }
    img.src = url
  })
}

const EMPTY: Partial<TeamMember> = { name: '', role: '', bio: '', photo: '', published: true }

/**
 * Founder tool to manage the About-page team. Members are published/unpublished
 * individually; only published ones appear on the public site.
 */
export function TeamEditor(): JSX.Element {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<TeamMember> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load(): Promise<void> {
    setLoading(true)
    try {
      setMembers(await api.founderTeam())
    } catch {
      setError('Could not load the team.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function saveMember(): Promise<void> {
    if (!editing?.name?.trim()) return setError('A name is required.')
    setBusy(true)
    setError(null)
    try {
      await api.saveTeamMember(editing)
      setEditing(null)
      await load()
    } catch {
      setError('Could not save. Check you are still signed in.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePublish(m: TeamMember): Promise<void> {
    await api.saveTeamMember({ id: m.id, published: !m.published })
    load()
  }

  async function remove(m: TeamMember): Promise<void> {
    if (!confirm(`Remove ${m.name} from the team?`)) return
    await api.deleteTeamMember(m.id)
    load()
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file || !editing) return
    try {
      const dataUrl = await resizeToDataUrl(file)
      setEditing({ ...editing, photo: dataUrl })
    } catch {
      setError('That image could not be read.')
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          <h3 className="text-lg font-bold text-ink">Team &amp; founders</h3>
        </div>
        {!editing && (
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            onClick={() => setEditing({ ...EMPTY, order: members.length })}
          >
            <Plus className="h-4 w-4" /> Add member
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-ink-muted">
        Published members appear in the “Meet the team” section of the public About page.
      </p>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {editing && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-bold text-ink">{editing.id ? 'Edit member' : 'New member'}</h4>
            <button className="text-ink-muted hover:text-ink" onClick={() => setEditing(null)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-5">
            <div className="shrink-0 text-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-white text-slate-400 hover:border-brand-400"
              >
                {editing.photo ? (
                  <img src={editing.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-6 w-6" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              <p className="mt-1 text-xs text-ink-muted">Photo</p>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <input
                className="input"
                placeholder="Full name"
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Role (e.g. Co-founder & CEO)"
                value={editing.role ?? ''}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
              />
              <textarea
                className="input min-h-[70px] resize-y sm:col-span-2"
                placeholder="Short bio (optional)"
                value={editing.bio ?? ''}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
              <input
                type="checkbox"
                checked={editing.published ?? true}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published (visible on the site)
            </label>
            <div className="ml-auto flex gap-2">
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-soft" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                onClick={saveMember}
                disabled={busy}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-ink-muted">
          No team members yet. Add one to show it on the About page.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
              {m.photo ? (
                <img src={m.photo} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{m.name}</div>
                <div className="truncate text-xs text-ink-muted">{m.role || '—'}</div>
              </div>
              {!m.published && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Hidden</span>
              )}
              <button className="rounded-lg p-2 text-ink-muted hover:bg-slate-100" title={m.published ? 'Unpublish' : 'Publish'} onClick={() => togglePublish(m)}>
                {m.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button className="rounded-lg p-2 text-ink-muted hover:bg-slate-100" title="Edit" onClick={() => setEditing(m)}>
                <ImagePlus className="h-4 w-4" />
              </button>
              <button className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Remove" onClick={() => remove(m)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
