import { app, ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, School, Language } from '@shared/types'
import { getDb, getIntegrityStatus, getDeviceId } from '../db/connection'
import { seedDemoData } from '../db/seed'
import { hashSecret } from '../services/auth'
import { logActivity } from '../services/activityLog'
import { issueInitialLicense } from '../services/license'
import { sessionManager } from '../session/sessionManager'

interface FirstRunPayload {
  name: string
  motto: string
  address: string
  phone: string
  email: string
  region: string
  division: string
  subdivision: string
  language: Language
  logoPath: string | null
  adminUsername: string
  adminPassword: string
}

function mapSchool(row: any): School {
  return {
    id: row.id,
    name: row.name,
    logoPath: row.logo_path,
    motto: row.motto,
    address: row.address,
    phone: row.phone,
    email: row.email,
    region: row.region,
    division: row.division,
    subdivision: row.subdivision,
    poBox: row.po_box ?? null,
    villageTown: row.village_town ?? null,
    aboutText: row.about_text ?? null,
    principalName: row.principal_name ?? null,
    promotionAverage: row.promotion_average ?? 10,
    language: row.language,
    currentAcademicYearId: row.current_academic_year_id,
    currentTermId: row.current_term_id,
    setupComplete: !!row.setup_complete
  }
}

export function registerAppHandlers(): void {
  ipcMain.handle(IPC.APP_GET_STATE, (): ApiResult<{ school: School | null }> => {
    try {
      const db = getDb()
      const row = db.prepare('SELECT * FROM schools WHERE id = 1').get()
      return { ok: true, data: { school: row ? mapSchool(row) : null } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.APP_INTEGRITY_STATUS, (): ApiResult<{ ok: boolean }> => {
    return { ok: true, data: getIntegrityStatus() }
  })

  // Quit the application — used by the "Exit Application" button on the
  // license-expired lock screen.
  ipcMain.handle(IPC.APP_QUIT, (): ApiResult<null> => {
    app.quit()
    return { ok: true, data: null }
  })

  ipcMain.handle(
    IPC.APP_FIRST_RUN_SETUP,
    async (_e, payload: FirstRunPayload): Promise<ApiResult<{ classCodes: Record<string, string> }>> => {
      try {
        const db = getDb()
        const already = db.prepare('SELECT setup_complete FROM schools WHERE id = 1').get() as
          | { setup_complete: number }
          | undefined
        if (already?.setup_complete) {
          return { ok: false, error: 'Setup has already been completed on this device.' }
        }

        const passwordHash = await hashSecret(payload.adminPassword)
        const deviceId = getDeviceId()

        const setup = db.transaction(() => {
          db.prepare(
            `INSERT INTO schools (id, name, logo_path, motto, address, phone, email, region, division, subdivision, language, setup_complete, device_id)
             VALUES (1, @name, @logoPath, @motto, @address, @phone, @email, @region, @division, @subdivision, @language, 1, @deviceId)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, logo_path=excluded.logo_path, motto=excluded.motto, address=excluded.address,
               phone=excluded.phone, email=excluded.email, region=excluded.region, division=excluded.division,
               subdivision=excluded.subdivision, language=excluded.language, setup_complete=1`
          ).run({
            name: payload.name,
            logoPath: payload.logoPath,
            motto: payload.motto,
            address: payload.address,
            phone: payload.phone,
            email: payload.email,
            region: payload.region,
            division: payload.division,
            subdivision: payload.subdivision,
            language: payload.language,
            deviceId
          })

          db.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).run(
            payload.adminUsername,
            passwordHash
          )
        })
        setup()

        const { classCodes } = await seedDemoData(db)

        // Assign the permanent School ID and issue the first-year provisional
        // license so the app is fully usable straight after setup (renewal then
        // needs a signed ELIGNITE activation code).
        issueInitialLicense()

        logActivity({
          actorType: 'admin',
          actorLabel: payload.adminUsername,
          action: 'Completed first-run setup',
          entityType: 'school',
          entityId: 1
        })

        return { ok: true, data: { classCodes } }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    }
  )
}
