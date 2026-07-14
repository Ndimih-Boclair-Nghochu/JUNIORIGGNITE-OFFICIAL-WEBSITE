import { ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { assertNotReadOnly } from '../services/license'
import { generateReportCard } from '../services/pdf/reportCard'
import { generateIdCard, type IdCardFormat } from '../services/pdf/idCard'

export function registerReportCardHandlers(): void {
  ipcMain.handle(
    IPC.REPORT_CARD_GENERATE,
    async (_e, { studentId, termId }: { studentId: number; termId: number }): Promise<ApiResult<{ path: string }>> => {
      try {
        const db = getDb()
        const student = db.prepare('SELECT class_id FROM students WHERE id = ?').get(studentId) as any
        if (!student) return { ok: false, error: 'Student not found.' }
        sessionManager.requireAdminOrClassScope(student.class_id)
        assertNotReadOnly()

        const path = await generateReportCard(db, studentId, termId)
        await shell.openPath(path)

        const session = sessionManager.get()!
        logActivity({
          actorType: session.role,
          actorLabel: session.role === 'admin' ? session.username : session.className,
          action: 'Generated report card',
          entityType: 'student',
          entityId: studentId
        })
        return { ok: true, data: { path } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.ID_CARD_GENERATE,
    async (_e, { studentId, format }: { studentId: number; format: IdCardFormat }): Promise<ApiResult<{ path: string }>> => {
      try {
        const db = getDb()
        const student = db.prepare('SELECT class_id FROM students WHERE id = ?').get(studentId) as any
        if (!student) return { ok: false, error: 'Student not found.' }
        sessionManager.requireAdminOrClassScope(student.class_id)

        const path = await generateIdCard(db, studentId, format ?? 'paper')
        await shell.openPath(path)

        const session = sessionManager.get()!
        logActivity({
          actorType: session.role,
          actorLabel: session.role === 'admin' ? session.username : session.className,
          action: 'Generated ID card',
          entityType: 'student',
          entityId: studentId
        })
        return { ok: true, data: { path } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
