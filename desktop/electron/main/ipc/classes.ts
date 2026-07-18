import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, SchoolClass, ClassSubject, Subsystem } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { hashSecret, generateAccessCode } from '../services/auth'

function mapClass(r: any): SchoolClass {
  return {
    id: r.id,
    name: r.name,
    subsystem: r.subsystem,
    capacity: r.capacity,
    classTeacherId: r.class_teacher_id,
    classTeacherName: r.teacher_first_name ? `${r.teacher_first_name} ${r.teacher_last_name}` : null,
    studentCount: r.student_count ?? 0,
    hasAccessCode: !!r.access_code_hash,
    levelId: r.level_id ?? null,
    levelName: r.level_name ?? null
  }
}

const CLASS_SELECT = `
  SELECT c.*, t.first_name as teacher_first_name, t.last_name as teacher_last_name,
         l.name as level_name, l.order_index as level_order,
         (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
  FROM classes c LEFT JOIN teachers t ON t.id = c.class_teacher_id
  LEFT JOIN class_levels l ON l.id = c.level_id`

export function registerClassHandlers(): void {
  ipcMain.handle(IPC.CLASSES_LIST, (): ApiResult<SchoolClass[]> => {
    try {
      const db = getDb()
      // Ordered by the promotion ladder first so classes read Class One → Two → …
      const rows = db.prepare(`${CLASS_SELECT} ORDER BY COALESCE(l.order_index, 9999), c.name`).all() as any[]
      return { ok: true, data: rows.map(mapClass) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.CLASSES_GET, (_e, { id }: { id: number }): ApiResult<SchoolClass & { subjects: ClassSubject[] }> => {
    try {
      const db = getDb()
      const row = db.prepare(`${CLASS_SELECT} WHERE c.id = ?`).get(id) as any
      if (!row) return { ok: false, error: 'Class not found.' }
      const subjectRows = db
        .prepare(
          `SELECT cs.*, sub.name as subject_name, t.first_name as tf, t.last_name as tl
           FROM class_subjects cs JOIN subjects sub ON sub.id = cs.subject_id
           LEFT JOIN teachers t ON t.id = cs.teacher_id WHERE cs.class_id = ?`
        )
        .all(id) as any[]
      const subjects: ClassSubject[] = subjectRows.map((s) => ({
        id: s.id,
        classId: s.class_id,
        subjectId: s.subject_id,
        subjectName: s.subject_name,
        teacherId: s.teacher_id,
        teacherName: s.tf ? `${s.tf} ${s.tl}` : null,
        coefficient: s.coefficient
      }))
      return { ok: true, data: { ...mapClass(row), subjects } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.CLASSES_CREATE,
    async (
      _e,
      payload: { name: string; subsystem: Subsystem; capacity: number; classTeacherId: number | null; levelId: number | null }
    ): Promise<ApiResult<{ schoolClass: SchoolClass; accessCode: string }>> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const code = generateAccessCode()
        const hash = await hashSecret(code)
        const info = db
          .prepare(
            `INSERT INTO classes (name, subsystem, capacity, access_code_hash, class_teacher_id, level_id) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(payload.name, payload.subsystem, payload.capacity, hash, payload.classTeacherId, payload.levelId ?? null)
        const id = info.lastInsertRowid as number
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Created class ${payload.name}`,
          entityType: 'class',
          entityId: id
        })
        const row = db.prepare(`${CLASS_SELECT} WHERE c.id = ?`).get(id)
        return { ok: true, data: { schoolClass: mapClass(row), accessCode: code } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.CLASSES_UPDATE,
    (
      _e,
      payload: {
        id: number
        name?: string
        subsystem?: Subsystem
        capacity?: number
        classTeacherId?: number | null
        levelId?: number | null
      }
    ): ApiResult<SchoolClass> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const current = db.prepare('SELECT * FROM classes WHERE id = ?').get(payload.id) as any
        if (!current) return { ok: false, error: 'Class not found.' }
        const merged = {
          name: payload.name ?? current.name,
          subsystem: payload.subsystem ?? current.subsystem,
          capacity: payload.capacity ?? current.capacity,
          classTeacherId: payload.classTeacherId !== undefined ? payload.classTeacherId : current.class_teacher_id,
          levelId: payload.levelId !== undefined ? payload.levelId : current.level_id,
          id: payload.id
        }
        db.prepare(
          `UPDATE classes SET name=@name, subsystem=@subsystem, capacity=@capacity, class_teacher_id=@classTeacherId, level_id=@levelId WHERE id=@id`
        ).run(merged)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Updated class ${merged.name}`,
          entityType: 'class',
          entityId: payload.id
        })
        const row = db.prepare(`${CLASS_SELECT} WHERE c.id = ?`).get(payload.id)
        return { ok: true, data: mapClass(row) }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(IPC.CLASSES_DELETE, (_e, { id }: { id: number }): ApiResult<null> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(id) as any
      if (!cls) return { ok: false, error: 'Class not found.' }
      const studentCount = (db.prepare('SELECT COUNT(*) as c FROM students WHERE class_id = ?').get(id) as { c: number }).c
      if (studentCount > 0) return { ok: false, error: 'Cannot delete a class that still has students assigned.' }
      db.prepare('DELETE FROM classes WHERE id = ?').run(id)
      logActivity({
        actorType: 'admin',
        actorLabel: session.username,
        action: `Deleted class ${cls.name}`,
        entityType: 'class',
        entityId: id
      })
      return { ok: true, data: null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.CLASSES_REGENERATE_CODE,
    async (_e, { id }: { id: number }): Promise<ApiResult<{ accessCode: string }>> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(id) as any
        if (!cls) return { ok: false, error: 'Class not found.' }
        const code = generateAccessCode()
        const hash = await hashSecret(code)
        db.prepare('UPDATE classes SET access_code_hash = ? WHERE id = ?').run(hash, id)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Regenerated access code for ${cls.name}`,
          entityType: 'class',
          entityId: id
        })
        return { ok: true, data: { accessCode: code } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.CLASSES_ASSIGN_SUBJECT,
    (
      _e,
      payload: { classId: number; subjectId: number; teacherId: number | null; coefficient: number }
    ): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        db.prepare(
          `INSERT INTO class_subjects (class_id, subject_id, teacher_id, coefficient) VALUES (@classId, @subjectId, @teacherId, @coefficient)
           ON CONFLICT(class_id, subject_id) DO UPDATE SET teacher_id=excluded.teacher_id, coefficient=excluded.coefficient`
        ).run(payload)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: 'Updated subject assignment',
          entityType: 'class',
          entityId: payload.classId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.CLASSES_UNASSIGN_SUBJECT,
    (_e, { classId, subjectId }: { classId: number; subjectId: number }): ApiResult<null> => {
      try {
        sessionManager.requireAdmin()
        const db = getDb()
        db.prepare('DELETE FROM class_subjects WHERE class_id = ? AND subject_id = ?').run(classId, subjectId)
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
