import { getDb } from '../db/connection'

/**
 * Moves a pupil to a new status/class and records the change in student_history,
 * atomically. Shared by the single-student actions (promote/transfer/withdraw…)
 * and the bulk end-of-year promotion run so both leave an identical audit trail.
 */
export function transitionStudent(
  studentId: number,
  toStatus: string,
  eventType: string,
  toClassId: number | null,
  notes: string | null
): any {
  const db = getDb()
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId) as any
  if (!student) throw new Error('Student not found.')
  const run = db.transaction(() => {
    db.prepare(`UPDATE students SET status = ?, class_id = ?, last_modified_at = datetime('now') WHERE id = ?`).run(
      toStatus,
      toClassId,
      studentId
    )
    db.prepare(
      `INSERT INTO student_history (student_id, event_type, from_class_id, to_class_id, notes) VALUES (?, ?, ?, ?, ?)`
    ).run(studentId, eventType, student.class_id, toClassId, notes)
  })
  run()
  return student
}
