import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, SchoolClass } from '@shared/types'
import { getDb } from '../db/connection'

export function registerLandingHandlers(): void {
  ipcMain.handle(IPC.LANDING_LIST_CLASSES, (): ApiResult<SchoolClass[]> => {
    try {
      const db = getDb()
      const rows = db
        .prepare(
          `SELECT c.*, t.first_name as teacher_first_name, t.last_name as teacher_last_name,
                  (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
           FROM classes c
           LEFT JOIN teachers t ON t.id = c.class_teacher_id
           ORDER BY c.name`
        )
        .all() as any[]

      const data: SchoolClass[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        subsystem: r.subsystem,
        capacity: r.capacity,
        classTeacherId: r.class_teacher_id,
        classTeacherName: r.teacher_first_name ? `${r.teacher_first_name} ${r.teacher_last_name}` : null,
        studentCount: r.student_count,
        hasAccessCode: !!r.access_code_hash
      }))

      return { ok: true, data }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
