import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, SyncConflict } from '@shared/types'
import { runSync, listConflicts, resolveConflict, simulateConflict } from '../services/sync'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'

export function registerSyncHandlers(): void {
  ipcMain.handle(IPC.SYNC_RUN, async (): Promise<ApiResult<{ pushed: number; pulled: number; conflicts: number }>> => {
    try {
      sessionManager.requireAdmin()
      const result = await runSync()
      return { ok: true, data: result }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SYNC_LIST_CONFLICTS, (): ApiResult<SyncConflict[]> => {
    try {
      sessionManager.requireAdmin()
      return { ok: true, data: listConflicts(false) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.SYNC_RESOLVE_CONFLICT,
    (_e, { conflictId, choice }: { conflictId: number; choice: 'local' | 'remote' }): ApiResult<null> => {
      try {
        const session = sessionManager.requireAdmin()
        resolveConflict(conflictId, choice)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Resolved sync conflict (kept ${choice})`,
          entityType: 'sync_conflict',
          entityId: conflictId
        })
        return { ok: true, data: null }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(IPC.SYNC_SIMULATE_CONFLICT, (): ApiResult<{ created: number }> => {
    try {
      sessionManager.requireAdmin()
      return { ok: true, data: simulateConflict() }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
