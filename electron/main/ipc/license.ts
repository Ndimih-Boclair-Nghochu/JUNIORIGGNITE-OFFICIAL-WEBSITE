import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, LicenseInfo } from '@shared/types'
import { getLicenseInfo, renewLicense } from '../services/license'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'

export function registerLicenseHandlers(): void {
  ipcMain.handle(IPC.LICENSE_STATUS, (): ApiResult<LicenseInfo> => {
    try {
      return { ok: true, data: getLicenseInfo() }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.LICENSE_RENEW, (): ApiResult<LicenseInfo> => {
    try {
      const session = sessionManager.requireAdmin()
      const info = renewLicense()
      logActivity({ actorType: 'admin', actorLabel: session.username, action: 'Renewed license', entityType: 'license', entityId: 1 })
      return { ok: true, data: info }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
