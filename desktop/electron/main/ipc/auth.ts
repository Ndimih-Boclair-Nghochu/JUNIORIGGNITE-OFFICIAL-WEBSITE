import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, Session } from '@shared/types'
import { getDb } from '../db/connection'
import { hashSecret, verifySecret } from '../services/auth'
import { logActivity } from '../services/activityLog'
import { sessionManager } from '../session/sessionManager'

/**
 * Failed recovery attempts are throttled in memory. The security answer is the
 * only thing standing between a stranger at the office computer and a password
 * reset, so brute-forcing it must be slow. Cleared on app restart, which is
 * acceptable: an attacker restarting the app is already at the machine.
 */
const MAX_RECOVERY_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const recoveryAttempts = new Map<string, { fails: number; lockedUntil: number }>()

function recoveryLockRemaining(username: string): number {
  const entry = recoveryAttempts.get(username.toLowerCase())
  if (!entry) return 0
  return Math.max(0, entry.lockedUntil - Date.now())
}

function noteRecoveryFailure(username: string): void {
  const key = username.toLowerCase()
  const entry = recoveryAttempts.get(key) ?? { fails: 0, lockedUntil: 0 }
  entry.fails += 1
  if (entry.fails >= MAX_RECOVERY_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS
    entry.fails = 0
  }
  recoveryAttempts.set(key, entry)
}

function clearRecoveryFailures(username: string): void {
  recoveryAttempts.delete(username.toLowerCase())
}

export function registerAuthHandlers(): void {
  ipcMain.handle(
    IPC.AUTH_ADMIN_LOGIN,
    async (_e, { username, password }: { username: string; password: string }): Promise<ApiResult<Session>> => {
      try {
        const db = getDb()
        const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as
          | { id: number; username: string; password_hash: string }
          | undefined
        if (!admin) return { ok: false, error: 'Invalid username or password.' }

        const valid = await verifySecret(password, admin.password_hash)
        if (!valid) return { ok: false, error: 'Invalid username or password.' }

        sessionManager.setAdmin(admin.id, admin.username)
        logActivity({ actorType: 'admin', actorLabel: admin.username, action: 'Logged in' })
        return { ok: true, data: sessionManager.get() }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.AUTH_UNLOCK_CLASS,
    async (_e, { classId, code }: { classId: number; code: string }): Promise<ApiResult<Session>> => {
      try {
        const db = getDb()
        const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId) as
          | { id: number; name: string; access_code_hash: string; class_teacher_id: number | null }
          | undefined
        if (!cls) return { ok: false, error: 'Class not found.' }

        const valid = await verifySecret(code, cls.access_code_hash)
        if (!valid) return { ok: false, error: 'Incorrect access code.' }

        sessionManager.setTeacher(cls.class_teacher_id, cls.id, cls.name)
        logActivity({
          actorType: 'teacher',
          actorLabel: cls.name,
          action: 'Opened class',
          entityType: 'class',
          entityId: cls.id
        })
        return { ok: true, data: sessionManager.get() }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(IPC.AUTH_LOGOUT, (): ApiResult<null> => {
    sessionManager.clear()
    return { ok: true, data: null }
  })

  ipcMain.handle(IPC.AUTH_CURRENT_SESSION, (): ApiResult<Session> => {
    return { ok: true, data: sessionManager.get() }
  })

  ipcMain.handle(
    IPC.AUTH_CHANGE_ADMIN_PASSWORD,
    async (
      _e,
      { currentPassword, newPassword }: { currentPassword: string; newPassword: string }
    ): Promise<ApiResult<null>> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(session.adminId) as {
          id: number
          password_hash: string
        }
        const valid = await verifySecret(currentPassword, admin.password_hash)
        if (!valid) return { ok: false, error: 'Current password is incorrect.' }

        const newHash = await hashSecret(newPassword)
        db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, admin.id)
        logActivity({ actorType: 'admin', actorLabel: session.username, action: 'Changed password' })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  /** Step 1 of recovery: look up the security question for a username. */
  ipcMain.handle(
    IPC.AUTH_RECOVERY_QUESTION,
    (_e, { username }: { username: string }): ApiResult<{ question: string | null }> => {
      try {
        const locked = recoveryLockRemaining(username)
        if (locked > 0) {
          return { ok: false, error: `Too many attempts. Try again in ${Math.ceil(locked / 60000)} minute(s).` }
        }
        const db = getDb()
        const admin = db.prepare('SELECT security_question FROM admins WHERE username = ?').get(username) as
          | { security_question: string | null }
          | undefined
        // Deliberately does not reveal whether the username exists.
        return { ok: true, data: { question: admin?.security_question ?? null } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  /** Step 2 of recovery: answer the question to set a new password. */
  ipcMain.handle(
    IPC.AUTH_RESET_PASSWORD,
    async (
      _e,
      { username, answer, newPassword }: { username: string; answer: string; newPassword: string }
    ): Promise<ApiResult<null>> => {
      try {
        const locked = recoveryLockRemaining(username)
        if (locked > 0) {
          return { ok: false, error: `Too many attempts. Try again in ${Math.ceil(locked / 60000)} minute(s).` }
        }
        if (!newPassword || newPassword.length < 4) {
          return { ok: false, error: 'New password must be at least 4 characters.' }
        }

        const db = getDb()
        const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as
          | { id: number; username: string; security_answer_hash: string | null }
          | undefined

        if (!admin?.security_answer_hash) {
          noteRecoveryFailure(username)
          return {
            ok: false,
            error: 'Password recovery is not set up for this account. Ask your JuniorIgnite provider for help.'
          }
        }

        // Answers are compared case-insensitively and trimmed — people rarely
        // retype capitalisation the same way months later.
        const valid = await verifySecret(normaliseAnswer(answer), admin.security_answer_hash)
        if (!valid) {
          noteRecoveryFailure(username)
          return { ok: false, error: 'That answer is not correct.' }
        }

        db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(await hashSecret(newPassword), admin.id)
        clearRecoveryFailures(username)
        logActivity({
          actorType: 'admin',
          actorLabel: admin.username,
          action: 'Reset password via security question'
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  /** Set or change the security question (requires the current password). */
  ipcMain.handle(
    IPC.AUTH_SET_SECURITY_QUESTION,
    async (
      _e,
      { currentPassword, question, answer }: { currentPassword: string; question: string; answer: string }
    ): Promise<ApiResult<null>> => {
      try {
        const session = sessionManager.requireAdmin()
        if (!question.trim() || !answer.trim()) {
          return { ok: false, error: 'Both a question and an answer are required.' }
        }
        const db = getDb()
        const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(session.adminId) as {
          id: number
          password_hash: string
        }
        const valid = await verifySecret(currentPassword, admin.password_hash)
        if (!valid) return { ok: false, error: 'Current password is incorrect.' }

        db.prepare('UPDATE admins SET security_question = ?, security_answer_hash = ? WHERE id = ?').run(
          question.trim(),
          await hashSecret(normaliseAnswer(answer)),
          admin.id
        )
        logActivity({ actorType: 'admin', actorLabel: session.username, action: 'Updated security question' })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}

/** Case-insensitive, whitespace-tolerant form of a security answer. */
export function normaliseAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ')
}
