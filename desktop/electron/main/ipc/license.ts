import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, LicenseInfo, RegistrationInfo, ActivationResult, StartupNotices } from '@shared/types'
import {
  getLicenseInfo,
  activateLicense,
  getRegistrationInfo,
  getStartupNotices,
  dismissUpdateReminder,
  ActivationError
} from '../services/license'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'

// Note: activation, registration info, and startup notices deliberately do NOT
// require an admin session. When the license has expired the app is locked and
// no one can log in, so the headmaster must be able to activate from the lock
// screen. Authorization here is the Ed25519-signed, device+school-bound code
// itself — not a UI session.
export function registerLicenseHandlers(): void {
  ipcMain.handle(IPC.LICENSE_STATUS, (): ApiResult<LicenseInfo> => {
    try {
      return { ok: true, data: getLicenseInfo() }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.LICENSE_ACTIVATE, (_e, { code }: { code: string }): ApiResult<ActivationResult> => {
    try {
      const license = activateLicense(code)
      const session = sessionManager.get()
      logActivity({
        actorType: 'admin',
        actorLabel: session?.role === 'admin' ? session.username : 'Headmaster',
        action: `Activated license (valid until ${new Date(license.expiresAt).toLocaleDateString()})`,
        entityType: 'license',
        entityId: 1
      })
      return { ok: true, data: { license } }
    } catch (err: any) {
      // ActivationError messages are user-facing and friendly; other errors fall through.
      const message = err instanceof ActivationError ? err.message : err.message
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(IPC.LICENSE_REGISTRATION_INFO, (): ApiResult<RegistrationInfo> => {
    try {
      return { ok: true, data: getRegistrationInfo() }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.LICENSE_STARTUP_NOTICES, (): ApiResult<StartupNotices> => {
    try {
      return { ok: true, data: getStartupNotices() }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.LICENSE_DISMISS_UPDATE, (_e, { kind }: { kind: 'monthly' | 'annual' }): ApiResult<null> => {
    try {
      dismissUpdateReminder(kind)
      return { ok: true, data: null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
