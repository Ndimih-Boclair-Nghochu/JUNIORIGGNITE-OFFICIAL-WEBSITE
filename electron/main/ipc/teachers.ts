import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, Teacher } from '@shared/types'
import { getDb, getDeviceId } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'

function mapTeacher(r: any, assignedClassNames: string[]): Teacher {
  return {
    id: r.id,
    photoPath: r.photo_path,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone,
    email: r.email,
    qualifications: r.qualifications,
    employmentDate: r.employment_date,
    status: r.status,
    assignedClassNames
  }
}

function getAssignedClassNames(db: ReturnType<typeof getDb>, teacherId: number): string[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT c.name FROM classes c WHERE c.class_teacher_id = ?
       UNION
       SELECT DISTINCT c.name FROM class_subjects cs JOIN classes c ON c.id = cs.class_id WHERE cs.teacher_id = ?`
    )
    .all(teacherId, teacherId) as { name: string }[]
  return rows.map((r) => r.name)
}

export function registerTeacherHandlers(): void {
  ipcMain.handle(IPC.TEACHERS_LIST, (): ApiResult<Teacher[]> => {
    try {
      sessionManager.requireAdmin()
      const db = getDb()
      const rows = db.prepare('SELECT * FROM teachers ORDER BY last_name, first_name').all() as any[]
      return { ok: true, data: rows.map((r) => mapTeacher(r, getAssignedClassNames(db, r.id))) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TEACHERS_GET, (_e, { id }: { id: number }): ApiResult<Teacher> => {
    try {
      sessionManager.requireAdmin()
      const db = getDb()
      const row = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as any
      if (!row) return { ok: false, error: 'Teacher not found.' }
      return { ok: true, data: mapTeacher(row, getAssignedClassNames(db, id)) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TEACHERS_CREATE, (_e, payload: Partial<Teacher>): ApiResult<Teacher> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const info = db
        .prepare(
          `INSERT INTO teachers (photo_path, first_name, last_name, phone, email, qualifications, employment_date, status, device_id)
           VALUES (@photoPath, @firstName, @lastName, @phone, @email, @qualifications, @employmentDate, 'active', @deviceId)`
        )
        .run({
          photoPath: payload.photoPath ?? null,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          qualifications: payload.qualifications ?? null,
          employmentDate: payload.employmentDate ?? null,
          deviceId: getDeviceId()
        })
      const id = info.lastInsertRowid as number
      logActivity({
        actorType: 'admin',
        actorLabel: session.username,
        action: `Added teacher ${payload.firstName} ${payload.lastName}`,
        entityType: 'teacher',
        entityId: id
      })
      const row = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id)
      return { ok: true, data: mapTeacher(row, []) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TEACHERS_UPDATE, (_e, payload: Partial<Teacher> & { id: number }): ApiResult<Teacher> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const current = db.prepare('SELECT * FROM teachers WHERE id = ?').get(payload.id) as any
      if (!current) return { ok: false, error: 'Teacher not found.' }
      const merged = {
        photoPath: payload.photoPath ?? current.photo_path,
        firstName: payload.firstName ?? current.first_name,
        lastName: payload.lastName ?? current.last_name,
        phone: payload.phone ?? current.phone,
        email: payload.email ?? current.email,
        qualifications: payload.qualifications ?? current.qualifications,
        employmentDate: payload.employmentDate ?? current.employment_date,
        status: payload.status ?? current.status,
        id: payload.id
      }
      db.prepare(
        `UPDATE teachers SET photo_path=@photoPath, first_name=@firstName, last_name=@lastName, phone=@phone, email=@email,
         qualifications=@qualifications, employment_date=@employmentDate, status=@status, last_modified_at=datetime('now') WHERE id=@id`
      ).run(merged)
      logActivity({
        actorType: 'admin',
        actorLabel: session.username,
        action: `Updated teacher ${merged.firstName} ${merged.lastName}`,
        entityType: 'teacher',
        entityId: payload.id
      })
      const row = db.prepare('SELECT * FROM teachers WHERE id = ?').get(payload.id)
      return { ok: true, data: mapTeacher(row, getAssignedClassNames(db, payload.id)) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TEACHERS_DELETE, (_e, { id }: { id: number }): ApiResult<null> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as any
      if (!teacher) return { ok: false, error: 'Teacher not found.' }
      db.prepare('UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ?').run(id)
      db.prepare('UPDATE class_subjects SET teacher_id = NULL WHERE teacher_id = ?').run(id)
      db.prepare('DELETE FROM teachers WHERE id = ?').run(id)
      logActivity({
        actorType: 'admin',
        actorLabel: session.username,
        action: `Deleted teacher ${teacher.first_name} ${teacher.last_name}`,
        entityType: 'teacher',
        entityId: id
      })
      return { ok: true, data: null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
