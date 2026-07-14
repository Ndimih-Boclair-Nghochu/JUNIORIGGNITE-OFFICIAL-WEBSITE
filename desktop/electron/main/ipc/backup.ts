import { ipcMain, app, shell } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult } from '@shared/types'
import { createBackupWithDialog, listBackups, restoreBackupWithDialog } from '../services/backup'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'
import { closeDb } from '../db/connection'

export function registerBackupHandlers(): void {
  ipcMain.handle(IPC.BACKUP_CREATE, async (): Promise<ApiResult<{ path: string | null }>> => {
    try {
      const session = sessionManager.requireAdmin()
      const filePath = await createBackupWithDialog()
      if (filePath) {
        logActivity({ actorType: 'admin', actorLabel: session.username, action: 'Created backup' })
        shell.showItemInFolder(filePath)
      }
      return { ok: true, data: { path: filePath } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.BACKUP_LIST,
    (): ApiResult<{ path: string; name: string; size: number; createdAt: string }[]> => {
      try {
        sessionManager.requireAdmin()
        return { ok: true, data: listBackups() }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(IPC.BACKUP_RESTORE, async (): Promise<ApiResult<{ restored: boolean }>> => {
    try {
      const session = sessionManager.requireAdmin()
      const result = await restoreBackupWithDialog()
      if (result.restored) {
        logActivity({ actorType: 'admin', actorLabel: session.username, action: 'Restored from backup' })
        // Relaunch so the freshly-swapped DB file is opened cleanly.
        closeDb()
        app.relaunch()
        app.exit(0)
      }
      return { ok: true, data: { restored: result.restored } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
