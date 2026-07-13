import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, ActivityLogEntry } from '@shared/types'
import { listActivity } from '../services/activityLog'
import { sessionManager } from '../session/sessionManager'

export function registerActivityLogHandlers(): void {
  ipcMain.handle(IPC.ACTIVITY_LOG_LIST, (_e, { limit }: { limit?: number } = {}): ApiResult<ActivityLogEntry[]> => {
    try {
      sessionManager.requireAdmin()
      return { ok: true, data: listActivity(limit ?? 50) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
