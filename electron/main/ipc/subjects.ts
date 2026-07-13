import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, Subject } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { assertNotReadOnly } from '../services/license'

function getAssignedClasses(
  db: ReturnType<typeof getDb>,
  subjectId: number
): { classId: number; className: string; coefficient: number }[] {
  const rows = db
    .prepare(
      `SELECT cs.class_id, c.name as class_name, cs.coefficient
       FROM class_subjects cs JOIN classes c ON c.id = cs.class_id
       WHERE cs.subject_id = ? ORDER BY c.name`
    )
    .all(subjectId) as any[]
  return rows.map((r) => ({ classId: r.class_id, className: r.class_name, coefficient: r.coefficient }))
}

function mapSubject(db: ReturnType<typeof getDb>, r: any): Subject {
  return { id: r.id, name: r.name, nameFr: r.name_fr, assignedClasses: getAssignedClasses(db, r.id) }
}

export function registerSubjectHandlers(): void {
  ipcMain.handle(IPC.SUBJECTS_LIST, (): ApiResult<Subject[]> => {
    try {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM subjects ORDER BY name').all() as any[]
      return { ok: true, data: rows.map((r) => mapSubject(db, r)) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.SUBJECTS_CREATE,
    (
      _e,
      payload: { name: string; nameFr?: string; classId?: number; coefficient?: number }
    ): ApiResult<Subject> => {
    try {
      const session = sessionManager.requireAdmin()
      assertNotReadOnly()
      const db = getDb()
      const create = db.transaction(() => {
        const info = db
          .prepare('INSERT INTO subjects (name, name_fr) VALUES (?, ?)')
          .run(payload.name, payload.nameFr ?? null)
        const subjectId = info.lastInsertRowid as number
        // Optionally assign the new subject to a class with a coefficient in one step.
        if (payload.classId) {
          db.prepare(
            `INSERT INTO class_subjects (class_id, subject_id, teacher_id, coefficient) VALUES (?, ?, NULL, ?)
             ON CONFLICT(class_id, subject_id) DO UPDATE SET coefficient = excluded.coefficient`
          ).run(payload.classId, subjectId, payload.coefficient ?? 1)
        }
        return subjectId
      })
      const id = create()
      logActivity({ actorType: 'admin', actorLabel: session.username, action: `Added subject ${payload.name}`, entityType: 'subject', entityId: id })
      return { ok: true, data: mapSubject(db, db.prepare('SELECT * FROM subjects WHERE id = ?').get(id)) }
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
      return { ok: true, data: mapSubject(db, db.prepare('SELECT * FROM subjects WHERE id = ?').get(payload.id)) }
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
