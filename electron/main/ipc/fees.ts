import { ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, FeeStructure, FeePayment, FeeMethod } from '@shared/types'
import { getDb, getDeviceId } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { generateReceipt } from '../services/pdf/receipt'
import { assertNotReadOnly } from '../services/license'

function mapStructure(r: any): FeeStructure {
  return { id: r.id, classId: r.class_id, termId: r.term_id, amount: r.amount, description: r.description }
}

function mapPayment(r: any): FeePayment {
  return {
    id: r.id,
    studentId: r.student_id,
    termId: r.term_id,
    amount: r.amount,
    method: r.method,
    reference: r.reference,
    paidAt: r.paid_at,
    recordedBy: r.recorded_by,
    lastModifiedAt: r.last_modified_at
  }
}

export function registerFeeHandlers(): void {
  ipcMain.handle(IPC.FEES_LIST_STRUCTURES, (_e, { termId }: { termId: number }): ApiResult<FeeStructure[]> => {
    try {
      sessionManager.requireAdmin()
      const db = getDb()
      const rows = db.prepare('SELECT * FROM fee_structures WHERE term_id = ?').all(termId) as any[]
      return { ok: true, data: rows.map(mapStructure) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.FEES_SAVE_STRUCTURE,
    (_e, payload: { classId: number; termId: number; amount: number; description?: string }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        db.prepare(
          `INSERT INTO fee_structures (class_id, term_id, amount, description) VALUES (@classId, @termId, @amount, @description)
           ON CONFLICT(class_id, term_id) DO UPDATE SET amount=excluded.amount, description=excluded.description`
        ).run({ classId: payload.classId, termId: payload.termId, amount: payload.amount, description: payload.description ?? null })
        logActivity({ actorType: 'admin', actorLabel: session.username, action: 'Updated fee structure', entityType: 'class', entityId: payload.classId })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.FEES_LIST_PAYMENTS,
    (
      _e,
      { termId, classId }: { termId: number; classId?: number }
    ): ApiResult<
      {
        studentId: number
        studentName: string
        admissionNo: string
        className: string
        expected: number
        paid: number
        balance: number
        payments: FeePayment[]
      }[]
    > => {
      try {
        sessionManager.requireAdmin()
        const db = getDb()
        let sql = `SELECT s.id, s.first_name, s.last_name, s.admission_no, s.class_id, c.name as class_name
                   FROM students s JOIN classes c ON c.id = s.class_id WHERE s.status IN ('active','repeating')`
        const params: any[] = []
        if (classId) {
          sql += ' AND s.class_id = ?'
          params.push(classId)
        }
        sql += ' ORDER BY c.name, s.last_name'
        const students = db.prepare(sql).all(...params) as any[]

        const data = students.map((s) => {
          const structure = db
            .prepare('SELECT amount FROM fee_structures WHERE class_id = ? AND term_id = ?')
            .get(s.class_id, termId) as { amount: number } | undefined
          const paymentRows = db
            .prepare('SELECT * FROM fee_payments WHERE student_id = ? AND term_id = ? ORDER BY paid_at DESC')
            .all(s.id, termId) as any[]
          const paid = paymentRows.reduce((sum, p) => sum + p.amount, 0)
          const expected = structure?.amount ?? 0
          return {
            studentId: s.id,
            studentName: `${s.first_name} ${s.last_name}`,
            admissionNo: s.admission_no,
            className: s.class_name,
            expected,
            paid,
            balance: Math.max(0, expected - paid),
            payments: paymentRows.map(mapPayment)
          }
        })
        return { ok: true, data }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.FEES_RECORD_PAYMENT,
    (
      _e,
      payload: { studentId: number; termId: number; amount: number; method: FeeMethod; reference?: string }
    ): ApiResult<{ paymentId: number }> => {
      try {
        const session = sessionManager.requireAdmin()
        assertNotReadOnly()
        const db = getDb()
        const info = db
          .prepare(
            `INSERT INTO fee_payments (student_id, term_id, amount, method, reference, recorded_by, device_id)
             VALUES (@studentId, @termId, @amount, @method, @reference, @recordedBy, @deviceId)`
          )
          .run({
            studentId: payload.studentId,
            termId: payload.termId,
            amount: payload.amount,
            method: payload.method,
            reference: payload.reference ?? null,
            recordedBy: session.username,
            deviceId: getDeviceId()
          })
        const paymentId = info.lastInsertRowid as number
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Recorded fee payment (${payload.amount} FCFA)`,
          entityType: 'student',
          entityId: payload.studentId
        })
        return { ok: true, data: { paymentId } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.FEES_BALANCE,
    (_e, { termId }: { termId: number }): ApiResult<{ totalExpected: number; totalCollected: number; totalOutstanding: number }> => {
      try {
        sessionManager.requireAdmin()
        const db = getDb()
        const collected = (
          db.prepare('SELECT COALESCE(SUM(amount),0) as s FROM fee_payments WHERE term_id = ?').get(termId) as { s: number }
        ).s
        const expected = (
          db
            .prepare(
              `SELECT COALESCE(SUM(fs.amount * cnt.n),0) as s FROM fee_structures fs
               JOIN (SELECT class_id, COUNT(*) as n FROM students WHERE status IN ('active','repeating') GROUP BY class_id) cnt
               ON cnt.class_id = fs.class_id WHERE fs.term_id = ?`
            )
            .get(termId) as { s: number }
        ).s
        return {
          ok: true,
          data: { totalExpected: expected, totalCollected: collected, totalOutstanding: Math.max(0, expected - collected) }
        }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.FEES_GENERATE_RECEIPT,
    async (_e, { paymentId }: { paymentId: number }): Promise<ApiResult<{ path: string }>> => {
      try {
        sessionManager.requireAdmin()
        const db = getDb()
        const path = await generateReceipt(db, paymentId)
        await shell.openPath(path)
        return { ok: true, data: { path } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
