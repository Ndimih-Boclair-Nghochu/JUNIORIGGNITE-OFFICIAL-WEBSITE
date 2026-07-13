import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, StudentResult, ReportCardMeta } from '@shared/types'
import { getDb, getDeviceId } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { computeClassResults } from '../services/marksCompute'
import { assertNotReadOnly } from '../services/license'

function requireScope(classId: number): void {
  sessionManager.requireAdminOrClassScope(classId)
}

function mapMeta(r: any): ReportCardMeta {
  return {
    studentId: r.student_id,
    termId: r.term_id,
    conduct: r.conduct,
    teacherComment: r.teacher_comment,
    headTeacherComment: r.head_teacher_comment,
    promotionDecision: r.promotion_decision,
    publishedAt: r.published_at
  }
}

export function registerMarksHandlers(): void {
  ipcMain.handle(
    IPC.MARKS_GET_FOR_CLASS,
    (_e, { classId, termId }: { classId: number; termId: number }): ApiResult<StudentResult[]> => {
      try {
        requireScope(classId)
        const db = getDb()
        return { ok: true, data: computeClassResults(db, classId, termId) }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.MARKS_SAVE,
    (
      _e,
      {
        studentId,
        subjectId,
        classId,
        termId,
        caMark,
        examMark
      }: { studentId: number; subjectId: number; classId: number; termId: number; caMark: number | null; examMark: number | null }
    ): ApiResult<null> => {
      try {
        requireScope(classId)
        assertNotReadOnly()
        const db = getDb()

        const existing = db
          .prepare('SELECT published FROM marks WHERE student_id = ? AND subject_id = ? AND term_id = ?')
          .get(studentId, subjectId, termId) as { published: number } | undefined
        if (existing?.published) {
          return { ok: false, error: 'These marks have already been published and can no longer be edited directly.' }
        }

        db.prepare(
          `INSERT INTO marks (student_id, subject_id, class_id, term_id, ca_mark, exam_mark, published, last_modified_at, device_id)
           VALUES (@studentId, @subjectId, @classId, @termId, @caMark, @examMark, 0, datetime('now'), @deviceId)
           ON CONFLICT(student_id, subject_id, term_id) DO UPDATE SET
             ca_mark=excluded.ca_mark, exam_mark=excluded.exam_mark, last_modified_at=datetime('now'), device_id=excluded.device_id`
        ).run({ studentId, subjectId, classId, termId, caMark, examMark, deviceId: getDeviceId() })

        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.MARKS_COMPUTE,
    (_e, { classId, termId }: { classId: number; termId: number }): ApiResult<StudentResult[]> => {
      try {
        requireScope(classId)
        const db = getDb()
        return { ok: true, data: computeClassResults(db, classId, termId) }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.MARKS_PUBLISH,
    (_e, { classId, termId }: { classId: number; termId: number }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const run = db.transaction(() => {
          db.prepare(`UPDATE marks SET published = 1 WHERE class_id = ? AND term_id = ?`).run(classId, termId)
          const students = db.prepare(`SELECT id FROM students WHERE class_id = ? AND status IN ('active','repeating')`).all(classId) as {
            id: number
          }[]
          for (const s of students) {
            db.prepare(
              `INSERT INTO report_card_meta (student_id, term_id, promotion_decision, published_at)
               VALUES (?, ?, COALESCE((SELECT promotion_decision FROM report_card_meta WHERE student_id = ? AND term_id = ?), 'pending'), datetime('now'))
               ON CONFLICT(student_id, term_id) DO UPDATE SET published_at = datetime('now')`
            ).run(s.id, termId, s.id, termId)
          }
        })
        run()
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Published results for class/term`,
          entityType: 'class',
          entityId: classId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.REPORT_CARD_META_GET,
    (_e, { studentId, termId }: { studentId: number; termId: number }): ApiResult<ReportCardMeta | null> => {
      try {
        const db = getDb()
        const row = db.prepare('SELECT * FROM report_card_meta WHERE student_id = ? AND term_id = ?').get(studentId, termId)
        return { ok: true, data: row ? mapMeta(row) : null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.REPORT_CARD_META_SAVE,
    (
      _e,
      payload: {
        studentId: number
        termId: number
        conduct?: string
        teacherComment?: string
        headTeacherComment?: string
        promotionDecision?: 'promoted' | 'repeat' | 'pending'
      }
    ): ApiResult<null> => {
      try {
        const session = sessionManager.get()
        if (!session) throw new Error('Authentication required')
        const db = getDb()
        db.prepare(
          `INSERT INTO report_card_meta (student_id, term_id, conduct, teacher_comment, head_teacher_comment, promotion_decision)
           VALUES (@studentId, @termId, @conduct, @teacherComment, @headTeacherComment, @promotionDecision)
           ON CONFLICT(student_id, term_id) DO UPDATE SET
             conduct = COALESCE(@conduct, conduct),
             teacher_comment = COALESCE(@teacherComment, teacher_comment),
             head_teacher_comment = COALESCE(@headTeacherComment, head_teacher_comment),
             promotion_decision = COALESCE(@promotionDecision, promotion_decision)`
        ).run({
          studentId: payload.studentId,
          termId: payload.termId,
          conduct: payload.conduct ?? null,
          teacherComment: payload.teacherComment ?? null,
          headTeacherComment: payload.headTeacherComment ?? null,
          promotionDecision: payload.promotionDecision ?? null
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
