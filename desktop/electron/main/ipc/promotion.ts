import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, ClassLevel, PromotionCandidate, PromotionPreview, SchoolClass } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { assertNotReadOnly } from '../services/license'
import { computeClassResults } from '../services/marksCompute'
import { transitionStudent } from '../services/studentTransition'

function mapLevel(r: any): ClassLevel {
  return { id: r.id, name: r.name, orderIndex: r.order_index, classCount: r.class_count ?? 0 }
}

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

const round2 = (n: number): number => Math.round(n * 100) / 100

export function registerPromotionHandlers(): void {
  /**
   * Everything the promotion screen needs for one source class: the pass mark,
   * where pupils would move to, and each pupil's average for the chosen basis
   * (a single term, or — when termId is null — the mean of the academic year's
   * term averages, which is what an end-of-year decision should use).
   */
  ipcMain.handle(
    IPC.PROMOTION_PREVIEW,
    (
      _e,
      {
        classId,
        termId,
        promotionAverage: override
      }: { classId: number; termId: number | null; promotionAverage?: number }
    ): ApiResult<PromotionPreview> => {
      try {
        sessionManager.requireAdmin()
        const db = getDb()

        const school = db.prepare('SELECT promotion_average FROM schools WHERE id = 1').get() as
          | { promotion_average: number }
          | undefined
        // The admin can set the pass mark per run; the school default is the fallback.
        const promotionAverage =
          override !== undefined && override !== null && Number.isFinite(Number(override))
            ? Number(override)
            : school?.promotion_average ?? 10

        const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId) as any
        if (!cls) return { ok: false, error: 'Class not found.' }

        const currentLevel = cls.level_id
          ? mapLevel(db.prepare('SELECT * FROM class_levels WHERE id = ?').get(cls.level_id))
          : null

        const nextLevelRow = currentLevel
          ? db
              .prepare('SELECT * FROM class_levels WHERE order_index > ? ORDER BY order_index LIMIT 1')
              .get(currentLevel.orderIndex)
          : undefined
        const nextLevel = nextLevelRow ? mapLevel(nextLevelRow) : null

        // Every class in the school is offered as a destination — the admin decides
        // where pupils go. The class above (when there is one) is only a suggestion.
        const targetClasses = (
          db
            .prepare(
              `SELECT c.*, l.name as level_name, t.first_name as teacher_first_name, t.last_name as teacher_last_name,
                      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
               FROM classes c LEFT JOIN class_levels l ON l.id = c.level_id
               LEFT JOIN teachers t ON t.id = c.class_teacher_id
               WHERE c.id != ? ORDER BY COALESCE(l.order_index, 9999), c.name`
            )
            .all(classId) as any[]
        ).map(mapClass)

        const suggestedClassId = nextLevel
          ? targetClasses.find((c) => c.levelId === nextLevel.id)?.id ?? null
          : null

        // Average basis: one term, or the mean across the year's terms.
        const students = db
          .prepare(
            `SELECT id, first_name, last_name, admission_no FROM students
             WHERE class_id = ? AND status IN ('active','repeating') ORDER BY last_name, first_name`
          )
          .all(classId) as { id: number; first_name: string; last_name: string; admission_no: string }[]

        const averageByStudent = new Map<number, number | null>()
        if (termId) {
          for (const r of computeClassResults(db, classId, termId)) averageByStudent.set(r.studentId, r.overallAverage)
        } else {
          const currentYear = db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get() as
            | { id: number }
            | undefined
          const yearTerms = currentYear
            ? (db.prepare('SELECT id FROM terms WHERE academic_year_id = ? ORDER BY order_index').all(currentYear.id) as {
                id: number
              }[])
            : (db.prepare('SELECT id FROM terms ORDER BY order_index').all() as { id: number }[])

          const totals = new Map<number, number[]>()
          for (const t of yearTerms) {
            for (const r of computeClassResults(db, classId, t.id)) {
              if (r.overallAverage === null) continue
              if (!totals.has(r.studentId)) totals.set(r.studentId, [])
              totals.get(r.studentId)!.push(r.overallAverage)
            }
          }
          for (const s of students) {
            const list = totals.get(s.id) ?? []
            averageByStudent.set(s.id, list.length ? round2(list.reduce((a, b) => a + b, 0) / list.length) : null)
          }
        }

        const candidates: PromotionCandidate[] = students.map((s) => {
          const average = averageByStudent.get(s.id) ?? null
          return {
            studentId: s.id,
            name: `${s.first_name} ${s.last_name}`,
            admissionNo: s.admission_no,
            average,
            eligible: average !== null && average >= promotionAverage
          }
        })

        return { ok: true, data: { promotionAverage, currentLevel, nextLevel, targetClasses, suggestedClassId, candidates } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  /**
   * Promotes the given pupils into `toClassId` (or graduates them when the class
   * is at the top level). Every pupil passed in is moved — the screen decides who
   * qualifies, so the admin can deliberately include pupils below the pass mark.
   */
  ipcMain.handle(
    IPC.PROMOTION_RUN,
    (
      _e,
      {
        studentIds,
        toClassId,
        graduate,
        notes,
        termId
      }: { studentIds: number[]; toClassId: number | null; graduate?: boolean; notes?: string; termId?: number | null }
    ): ApiResult<{ promoted: number }> => {
      try {
        const session = sessionManager.requireAdmin()
        assertNotReadOnly()
        if (!studentIds?.length) return { ok: false, error: 'Select at least one pupil to promote.' }
        if (!graduate && !toClassId) return { ok: false, error: 'Choose the class to promote the pupils into.' }

        const db = getDb()
        if (toClassId && !db.prepare('SELECT id FROM classes WHERE id = ?').get(toClassId)) {
          return { ok: false, error: 'Destination class not found.' }
        }

        // The report card's FINAL DECISION reads report_card_meta.promotion_decision,
        // so stamp it for the term being closed — that is how a pupil's report shows
        // they were promoted. Defaults to the current academic year's last term.
        const currentYear = db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get() as
          | { id: number }
          | undefined
        const decisionTerm =
          termId ??
          ((
            db
              .prepare(
                currentYear
                  ? 'SELECT id FROM terms WHERE academic_year_id = ? ORDER BY order_index DESC LIMIT 1'
                  : 'SELECT id FROM terms ORDER BY order_index DESC LIMIT 1'
              )
              .get(...(currentYear ? [currentYear.id] : [])) as { id: number } | undefined
          )?.id ?? null)

        const markDecision = db.prepare(
          `INSERT INTO report_card_meta (student_id, term_id, promotion_decision)
           VALUES (?, ?, ?)
           ON CONFLICT(student_id, term_id) DO UPDATE SET promotion_decision = excluded.promotion_decision`
        )

        let promoted = 0
        for (const studentId of studentIds) {
          try {
            if (graduate) transitionStudent(studentId, 'graduated', 'graduation', null, notes ?? 'End-of-year graduation')
            else transitionStudent(studentId, 'active', 'promotion', toClassId, notes ?? 'End-of-year promotion')
            if (decisionTerm) markDecision.run(studentId, decisionTerm, 'promoted')
            promoted++
          } catch {
            // Skip pupils that vanished mid-run rather than aborting the batch.
          }
        }

        const target = toClassId ? (db.prepare('SELECT name FROM classes WHERE id = ?').get(toClassId) as { name: string }) : null
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: graduate ? `Graduated ${promoted} pupils` : `Promoted ${promoted} pupils to ${target?.name ?? ''}`,
          entityType: 'class',
          entityId: toClassId ?? undefined
        })
        return { ok: true, data: { promoted } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
