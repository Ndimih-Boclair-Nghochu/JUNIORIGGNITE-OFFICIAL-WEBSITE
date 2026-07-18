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
                  l.name as level_name, l.order_index as level_order,
                  (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
           FROM classes c
           LEFT JOIN teachers t ON t.id = c.class_teacher_id
           LEFT JOIN class_levels l ON l.id = c.level_id
           ORDER BY COALESCE(l.order_index, 9999), c.name`
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
        hasAccessCode: !!r.access_code_hash,
        levelId: r.level_id ?? null,
        levelName: r.level_name ?? null
      }))

      return { ok: true, data }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
