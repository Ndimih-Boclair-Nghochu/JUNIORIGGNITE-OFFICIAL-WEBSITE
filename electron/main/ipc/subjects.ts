import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, Subject } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'

function mapSubject(r: any): Subject {
  return { id: r.id, name: r.name, nameFr: r.name_fr }
}

export function registerSubjectHandlers(): void {
  ipcMain.handle(IPC.SUBJECTS_LIST, (): ApiResult<Subject[]> => {
    try {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM subjects ORDER BY name').all() as any[]
      return { ok: true, data: rows.map(mapSubject) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SUBJECTS_CREATE, (_e, payload: { name: string; nameFr?: string }): ApiResult<Subject> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const info = db.prepare('INSERT INTO subjects (name, name_fr) VALUES (?, ?)').run(payload.name, payload.nameFr ?? null)
      const id = info.lastInsertRowid as number
      logActivity({ actorType: 'admin', actorLabel: session.username, action: `Added subject ${payload.name}`, entityType: 'subject', entityId: id })
      return { ok: true, data: mapSubject(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id)) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SUBJECTS_UPDATE, (_e, payload: { id: number; name?: string; nameFr?: string }): ApiResult<Subject> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const current = db.prepare('SELECT * FROM subjects WHERE id = ?').get(payload.id) as any
      if (!current) return { ok: false, error: 'Subject not found.' }
      const merged = { name: payload.name ?? current.name, nameFr: payload.nameFr ?? current.name_fr, id: payload.id }
      db.prepare('UPDATE subjects SET name=@name, name_fr=@nameFr WHERE id=@id').run(merged)
      logActivity({ actorType: 'admin', actorLabel: session.username, action: `Updated subject ${merged.name}`, entityType: 'subject', entityId: payload.id })
      return { ok: true, data: mapSubject(db.prepare('SELECT * FROM subjects WHERE id = ?').get(payload.id)) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SUBJECTS_DELETE, (_e, { id }: { id: number }): ApiResult<null> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as any
      if (!subject) return { ok: false, error: 'Subject not found.' }
      db.prepare('DELETE FROM subjects WHERE id = ?').run(id)
      logActivity({ actorType: 'admin', actorLabel: session.username, action: `Deleted subject ${subject.name}`, entityType: 'subject', entityId: id })
      return { ok: true, data: null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
