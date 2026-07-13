import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, AttendanceStatus } from '@shared/types'
import { getDb, getDeviceId } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { assertNotReadOnly } from '../services/license'

function requireScope(classId: number): void {
  sessionManager.requireAdminOrClassScope(classId)
}

export function registerAttendanceHandlers(): void {
  ipcMain.handle(
    IPC.ATTENDANCE_GET_FOR_DATE,
    (_e, { classId, date }: { classId: number; date: string }): ApiResult<
      { studentId: number; firstName: string; lastName: string; status: AttendanceStatus | null }[]
    > => {
      try {
        requireScope(classId)
        const db = getDb()
        const rows = db
          .prepare(
            `SELECT s.id as student_id, s.first_name, s.last_name, a.status
             FROM students s
             LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
             WHERE s.class_id = ? AND s.status = 'active'
             ORDER BY s.last_name, s.first_name`
          )
          .all(date, classId) as any[]
        return {
          ok: true,
          data: rows.map((r) => ({
            studentId: r.student_id,
            firstName: r.first_name,
            lastName: r.last_name,
            status: r.status
          }))
        }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.ATTENDANCE_MARK,
    (
      _e,
      { studentId, classId, date, status }: { studentId: number; classId: number; date: string; status: AttendanceStatus }
    ): ApiResult<null> => {
      try {
        requireScope(classId)
        assertNotReadOnly()
        const db = getDb()
        const session = sessionManager.get()!
        const recordedBy = session.role === 'admin' ? session.username : session.className
        db.prepare(
          `INSERT INTO attendance (student_id, class_id, date, status, recorded_by, last_modified_at, device_id)
           VALUES (@studentId, @classId, @date, @status, @recordedBy, datetime('now'), @deviceId)
           ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status, recorded_by=excluded.recorded_by,
             last_modified_at=datetime('now'), device_id=excluded.device_id`
        ).run({ studentId, classId, date, status, recordedBy, deviceId: getDeviceId() })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.ATTENDANCE_SUMMARY,
    (
      _e,
      { classId }: { classId?: number } = {}
    ): ApiResult<{ studentId: number; name: string; presentPct: number; totalDays: number }[]> => {
      try {
        const session = sessionManager.get()
        if (!session) throw new Error('Authentication required')
        const scopedClassId = session.role === 'teacher' ? session.classId : classId

        const db = getDb()
        let sql = `
          SELECT s.id as student_id, s.first_name, s.last_name,
                 COUNT(a.id) as total_days,
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days
          FROM students s
          LEFT JOIN attendance a ON a.student_id = s.id
          WHERE s.status = 'active'`
        const params: any[] = []
        if (scopedClassId) {
          sql += ' AND s.class_id = ?'
          params.push(scopedClassId)
        }
        sql += ' GROUP BY s.id ORDER BY s.last_name, s.first_name'

        const rows = db.prepare(sql).all(...params) as any[]
        return {
          ok: true,
          data: rows.map((r) => ({
            studentId: r.student_id,
            name: `${r.first_name} ${r.last_name}`,
            totalDays: r.total_days,
            presentPct: r.total_days > 0 ? Math.round((r.present_days / r.total_days) * 100) : 0
          }))
        }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
