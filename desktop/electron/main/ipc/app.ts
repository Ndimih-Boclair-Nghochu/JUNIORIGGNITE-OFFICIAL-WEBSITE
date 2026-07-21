import { app, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, School, Language, UpdateInfo } from '@shared/types'
import { WEBSITE_URL } from '@shared/constants'

/** True when `a` is a higher semantic version than `b` (e.g. 1.2.0 > 1.1.9). */
function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}
import { getDb, getIntegrityStatus, getDeviceId } from '../db/connection'
import { initialiseAcademicSession } from '../db/seed'
import { hashSecret } from '../services/auth'
import { normaliseAnswer } from './auth'
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
  securityQuestion: string
  securityAnswer: string
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

  /**
   * Asks the JuniorIgnite website whether a newer version exists. This is the
   * ONLY outbound call the app makes — no school data leaves the machine. Being
   * offline is normal, not an error: it simply reports checked:false.
   */
  ipcMain.handle(IPC.APP_CHECK_UPDATE, async (): Promise<ApiResult<UpdateInfo>> => {
    const currentVersion = app.getVersion()
    const downloadPageUrl = WEBSITE_URL
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(`${WEBSITE_URL}/api/version`, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { version?: string }
      const latestVersion = body?.version ?? null
      return {
        ok: true,
        data: {
          updateAvailable: !!latestVersion && isNewer(latestVersion, currentVersion),
          currentVersion,
          latestVersion,
          downloadPageUrl,
          checked: true
        }
      }
    } catch {
      // Offline or the site is down — never surface this as a failure.
      return {
        ok: true,
        data: { updateAvailable: false, currentVersion, latestVersion: null, downloadPageUrl, checked: false }
      }
    }
  })

  /** Opens a link in the user's real browser (used by the Update button). */
  ipcMain.handle(IPC.APP_OPEN_EXTERNAL, async (_e, { url }: { url: string }): Promise<ApiResult<null>> => {
    try {
      // Only ever open our own site — never an arbitrary URL from the renderer.
      if (!url.startsWith(WEBSITE_URL)) return { ok: false, error: 'Refused to open an external link.' }
      await shell.openExternal(url)
      return { ok: true, data: null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
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
        // Security answer enables offline password recovery (no email available).
        const securityAnswerHash = payload.securityAnswer?.trim()
          ? await hashSecret(normaliseAnswer(payload.securityAnswer))
          : null
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

          db.prepare(
            `INSERT INTO admins (username, password_hash, security_question, security_answer_hash)
             VALUES (?, ?, ?, ?)`
          ).run(
            payload.adminUsername,
            passwordHash,
            payload.securityQuestion?.trim() || null,
            securityAnswerHash
          )
        })
        setup()

        // A new school starts completely empty — no sample classes, teachers or
        // pupils. Only the academic calendar is created so terms exist.
        initialiseAcademicSession(db)
        const classCodes: Record<string, string> = {}

        // Assign the permanent School ID and issue the first-year provisional
        // license so the app is fully usable straight after setup (renewal then
        // needs a signed ELIGNITE activation code).
        issueInitialLicense()

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
