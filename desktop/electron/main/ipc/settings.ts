import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, School } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'

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
    language: row.language,
    currentAcademicYearId: row.current_academic_year_id,
    currentTermId: row.current_term_id,
    setupComplete: !!row.setup_complete
  }
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, (): ApiResult<School | null> => {
    try {
      const db = getDb()
      const row = db.prepare('SELECT * FROM schools WHERE id = 1').get()
      return { ok: true, data: row ? mapSchool(row) : null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_e, patch: Partial<School>): ApiResult<School> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const current = db.prepare('SELECT * FROM schools WHERE id = 1').get() as any
      const merged = {
        name: patch.name ?? current.name,
        logo_path: patch.logoPath ?? current.logo_path,
        motto: patch.motto ?? current.motto,
        address: patch.address ?? current.address,
        phone: patch.phone ?? current.phone,
        email: patch.email ?? current.email,
        region: patch.region ?? current.region,
        division: patch.division ?? current.division,
        subdivision: patch.subdivision ?? current.subdivision,
        language: patch.language ?? current.language
      }
      db.prepare(
        `UPDATE schools SET name=@name, logo_path=@logo_path, motto=@motto, address=@address, phone=@phone,
         email=@email, region=@region, division=@division, subdivision=@subdivision, language=@language WHERE id = 1`
      ).run(merged)
      logActivity({ actorType: 'admin', actorLabel: session.username, action: 'Updated school settings' })
      const row = db.prepare('SELECT * FROM schools WHERE id = 1').get()
      return { ok: true, data: mapSchool(row) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
