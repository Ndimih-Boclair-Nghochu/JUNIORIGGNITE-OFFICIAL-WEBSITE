import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, DashboardSummary, ActivityLogEntry } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { listActivity } from '../services/activityLog'
import { getLicenseInfo } from '../services/license'

export function registerDashboardHandlers(): void {
  ipcMain.handle(IPC.DASHBOARD_SUMMARY, (): ApiResult<DashboardSummary> => {
    try {
      sessionManager.requireAdmin()
      const db = getDb()

      const totalStudents = (
        db.prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'active'`).get() as { c: number }
      ).c
      const totalTeachers = (
        db.prepare(`SELECT COUNT(*) as c FROM teachers WHERE status = 'active'`).get() as { c: number }
      ).c
      const totalClasses = (db.prepare(`SELECT COUNT(*) as c FROM classes`).get() as { c: number }).c
      const boys = (
        db.prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'active' AND gender = 'male'`).get() as {
          c: number
        }
      ).c
      const girls = (
        db.prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'active' AND gender = 'female'`).get() as {
          c: number
        }
      ).c

      const today = new Date().toISOString().slice(0, 10)
      const attendanceToday = db
        .prepare(`SELECT status, COUNT(*) as c FROM attendance WHERE date = ? GROUP BY status`)
        .all(today) as { status: string; c: number }[]
      const totalMarked = attendanceToday.reduce((sum, r) => sum + r.c, 0)
      const present = attendanceToday.find((r) => r.status === 'present')?.c ?? 0
      const attendanceTodayPresentPct = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : null

      const school = db.prepare('SELECT current_term_id FROM schools WHERE id = 1').get() as {
        current_term_id: number | null
      }
      let feesCollected = 0
      let feesOutstanding = 0
      if (school?.current_term_id) {
        feesCollected = (
          db
            .prepare(`SELECT COALESCE(SUM(amount),0) as s FROM fee_payments WHERE term_id = ?`)
            .get(school.current_term_id) as { s: number }
        ).s
        const feesExpected = (
          db
            .prepare(
              `SELECT COALESCE(SUM(fs.amount * cnt.n),0) as s FROM fee_structures fs
               JOIN (SELECT class_id, COUNT(*) as n FROM students WHERE status='active' GROUP BY class_id) cnt
               ON cnt.class_id = fs.class_id
               WHERE fs.term_id = ?`
            )
            .get(school.current_term_id) as { s: number }
        ).s
        feesOutstanding = Math.max(0, feesExpected - feesCollected)
      }

      const license = getLicenseInfo()
      const licenseStatus: DashboardSummary['licenseStatus'] = license.status
      const licenseDaysRemaining = license.daysRemaining

      return {
        ok: true,
        data: {
          totalStudents,
          totalTeachers,
          totalClasses,
          boys,
          girls,
          attendanceTodayPresentPct,
          feesCollected,
          feesOutstanding,
          licenseStatus,
          licenseDaysRemaining
        }
      }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.DASHBOARD_ACTIVITY, (): ApiResult<ActivityLogEntry[]> => {
    try {
      sessionManager.requireAdmin()
      return { ok: true, data: listActivity(15) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
