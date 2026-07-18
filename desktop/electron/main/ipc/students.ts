import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, Student, StudentHistoryEntry } from '@shared/types'
import { getDb, getDeviceId } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { assertNotReadOnly } from '../services/license'
import { transitionStudent } from '../services/studentTransition'

function mapStudent(r: any): Student {
  return {
    id: r.id,
    admissionNo: r.admission_no,
    photoPath: r.photo_path,
    firstName: r.first_name,
    lastName: r.last_name,
    dob: r.dob,
    gender: r.gender,
    classId: r.class_id,
    className: r.class_name ?? null,
    parentName: r.parent_name,
    parentPhone: r.parent_phone,
    parentEmail: r.parent_email,
    emergencyContact: r.emergency_contact,
    medicalNotes: r.medical_notes,
    previousSchool: r.previous_school,
    status: r.status,
    enrollmentDate: r.enrollment_date
  }
}

function generateAdmissionNo(db: ReturnType<typeof getDb>): string {
  const year = new Date().getFullYear()
  const count = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c
  let seq = count + 1
  // guard against gaps from deletions colliding with an existing number
  for (;;) {
    const candidate = `JI-${year}-${String(seq).padStart(3, '0')}`
    const exists = db.prepare('SELECT 1 FROM students WHERE admission_no = ?').get(candidate)
    if (!exists) return candidate
    seq += 1
  }
}

function requireAdminOrScope(classId: number | null): void {
  const session = sessionManager.get()
  if (!session) throw new Error('Authentication required')
  if (session.role === 'admin') return
  if (session.role === 'teacher' && classId !== null && session.classId === classId) return
  throw new Error('Not authorized for this class')
}

export function registerStudentHandlers(): void {
  ipcMain.handle(
    IPC.STUDENTS_LIST,
    (_e, filters: { classId?: number; search?: string } = {}): ApiResult<Student[]> => {
      try {
        const session = sessionManager.get()
        if (!session) throw new Error('Authentication required')
        const db = getDb()

        const scopedClassId = session.role === 'teacher' ? session.classId : filters.classId

        let sql = `SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE 1=1`
        const params: any[] = []
        if (scopedClassId) {
          sql += ' AND s.class_id = ?'
          params.push(scopedClassId)
        }
        if (filters.search) {
          sql += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ?)`
          const term = `%${filters.search}%`
          params.push(term, term, term)
        }
        sql += ' ORDER BY s.last_name, s.first_name'

        const rows = db.prepare(sql).all(...params) as any[]
        return { ok: true, data: rows.map(mapStudent) }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(IPC.STUDENTS_GET, (_e, { id }: { id: number }): ApiResult<Student> => {
    try {
      const db = getDb()
      const row = db
        .prepare(`SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?`)
        .get(id) as any
      if (!row) return { ok: false, error: 'Student not found.' }
      requireAdminOrScope(row.class_id)
      return { ok: true, data: mapStudent(row) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.STUDENTS_CREATE, (_e, payload: Partial<Student>): ApiResult<Student> => {
    try {
      requireAdminOrScope(payload.classId ?? null)
      assertNotReadOnly()
      const db = getDb()
      const admissionNo = payload.admissionNo?.trim() || generateAdmissionNo(db)
      const deviceId = getDeviceId()

      const info = db
        .prepare(
          `INSERT INTO students (admission_no, photo_path, first_name, last_name, dob, gender, class_id, parent_name, parent_phone, parent_email, emergency_contact, medical_notes, previous_school, status, enrollment_date, device_id)
           VALUES (@admissionNo, @photoPath, @firstName, @lastName, @dob, @gender, @classId, @parentName, @parentPhone, @parentEmail, @emergencyContact, @medicalNotes, @previousSchool, 'active', @enrollmentDate, @deviceId)`
        )
        .run({
          admissionNo,
          photoPath: payload.photoPath ?? null,
          firstName: payload.firstName,
          lastName: payload.lastName,
          dob: payload.dob ?? null,
          gender: payload.gender,
          classId: payload.classId ?? null,
          parentName: payload.parentName ?? null,
          parentPhone: payload.parentPhone ?? null,
          parentEmail: payload.parentEmail ?? null,
          emergencyContact: payload.emergencyContact ?? null,
          medicalNotes: payload.medicalNotes ?? null,
          previousSchool: payload.previousSchool ?? null,
          enrollmentDate: payload.enrollmentDate ?? new Date().toISOString().slice(0, 10),
          deviceId
        })

      const id = info.lastInsertRowid as number
      db.prepare(
        `INSERT INTO student_history (student_id, event_type, to_class_id, notes) VALUES (?, 'enrollment', ?, 'Registered')`
      ).run(id, payload.classId ?? null)

      const session = sessionManager.get()!
      logActivity({
        actorType: session.role,
        actorLabel: session.role === 'admin' ? session.username : session.className,
        action: `Registered student ${payload.firstName} ${payload.lastName}`,
        entityType: 'student',
        entityId: id
      })

      const row = db
        .prepare(`SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?`)
        .get(id)
      return { ok: true, data: mapStudent(row) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.STUDENTS_UPDATE, (_e, payload: Partial<Student> & { id: number }): ApiResult<Student> => {
    try {
      const db = getDb()
      const current = db.prepare('SELECT * FROM students WHERE id = ?').get(payload.id) as any
      if (!current) return { ok: false, error: 'Student not found.' }
      requireAdminOrScope(current.class_id)

      const merged = {
        photoPath: payload.photoPath ?? current.photo_path,
        firstName: payload.firstName ?? current.first_name,
        lastName: payload.lastName ?? current.last_name,
        dob: payload.dob ?? current.dob,
        gender: payload.gender ?? current.gender,
        parentName: payload.parentName ?? current.parent_name,
        parentPhone: payload.parentPhone ?? current.parent_phone,
        parentEmail: payload.parentEmail ?? current.parent_email,
        emergencyContact: payload.emergencyContact ?? current.emergency_contact,
        medicalNotes: payload.medicalNotes ?? current.medical_notes,
        previousSchool: payload.previousSchool ?? current.previous_school,
        id: payload.id
      }
      db.prepare(
        `UPDATE students SET photo_path=@photoPath, first_name=@firstName, last_name=@lastName, dob=@dob, gender=@gender,
         parent_name=@parentName, parent_phone=@parentPhone, parent_email=@parentEmail, emergency_contact=@emergencyContact,
         medical_notes=@medicalNotes, previous_school=@previousSchool, last_modified_at=datetime('now'), device_id=@deviceId
         WHERE id=@id`
      ).run({ ...merged, deviceId: getDeviceId() })

      const session = sessionManager.get()!
      logActivity({
        actorType: session.role,
        actorLabel: session.role === 'admin' ? session.username : session.className,
        action: `Updated student ${merged.firstName} ${merged.lastName}`,
        entityType: 'student',
        entityId: payload.id
      })

      const row = db
        .prepare(`SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?`)
        .get(payload.id)
      return { ok: true, data: mapStudent(row) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.STUDENTS_DELETE, (_e, { id }: { id: number }): ApiResult<null> => {
    try {
      sessionManager.requireAdmin()
      const db = getDb()
      const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any
      if (!student) return { ok: false, error: 'Student not found.' }
      db.prepare('DELETE FROM students WHERE id = ?').run(id)
      const session = sessionManager.requireAdmin()
      logActivity({
        actorType: 'admin',
        actorLabel: session.username,
        action: `Deleted student ${student.first_name} ${student.last_name}`,
        entityType: 'student',
        entityId: id
      })
      return { ok: true, data: null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.STUDENTS_HISTORY, (_e, { studentId }: { studentId: number }): ApiResult<StudentHistoryEntry[]> => {
    try {
      const db = getDb()
      const student = db.prepare('SELECT class_id FROM students WHERE id = ?').get(studentId) as any
      if (student) requireAdminOrScope(student.class_id)
      const rows = db
        .prepare(
          `SELECT h.*, fc.name as from_class_name, tc.name as to_class_name
           FROM student_history h
           LEFT JOIN classes fc ON fc.id = h.from_class_id
           LEFT JOIN classes tc ON tc.id = h.to_class_id
           WHERE h.student_id = ? ORDER BY h.created_at DESC`
        )
        .all(studentId) as any[]
      const data: StudentHistoryEntry[] = rows.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        eventType: r.event_type,
        fromClassId: r.from_class_id,
        toClassId: r.to_class_id,
        fromClassName: r.from_class_name,
        toClassName: r.to_class_name,
        notes: r.notes,
        createdAt: r.created_at
      }))
      return { ok: true, data }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.STUDENTS_PROMOTE,
    (_e, { studentId, toClassId, notes }: { studentId: number; toClassId: number; notes?: string }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const student = transitionStudent(studentId, 'active', 'promotion', toClassId, notes ?? null)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Promoted ${student.first_name} ${student.last_name}`,
          entityType: 'student',
          entityId: studentId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.STUDENTS_TRANSFER,
    (_e, { studentId, toClassId, notes }: { studentId: number; toClassId: number; notes?: string }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const student = transitionStudent(studentId, 'transferred', 'transfer', toClassId, notes ?? null)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Transferred ${student.first_name} ${student.last_name}`,
          entityType: 'student',
          entityId: studentId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.STUDENTS_WITHDRAW,
    (_e, { studentId, notes }: { studentId: number; notes?: string }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const student = transitionStudent(studentId, 'withdrawn', 'withdrawal', null, notes ?? null)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Withdrew ${student.first_name} ${student.last_name}`,
          entityType: 'student',
          entityId: studentId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.STUDENTS_GRADUATE,
    (_e, { studentId, notes }: { studentId: number; notes?: string }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const student = transitionStudent(studentId, 'graduated', 'graduation', null, notes ?? null)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Graduated ${student.first_name} ${student.last_name}`,
          entityType: 'student',
          entityId: studentId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.STUDENTS_MARK_REPEATING,
    (_e, { studentId, notes }: { studentId: number; notes?: string }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId) as any
        if (!student) return { ok: false, error: 'Student not found.' }
        transitionStudent(studentId, 'repeating', 'repeat', student.class_id, notes ?? 'Repeating current class (redoublant)')
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Marked ${student.first_name} ${student.last_name} as repeating`,
          entityType: 'student',
          entityId: studentId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
