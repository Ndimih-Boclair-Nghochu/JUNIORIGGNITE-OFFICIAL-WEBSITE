import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, Session } from '@shared/types'
import { getDb } from '../db/connection'
import { hashSecret, verifySecret } from '../services/auth'
import { logActivity } from '../services/activityLog'
import { sessionManager } from '../session/sessionManager'

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
}
