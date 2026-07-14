import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, Term } from '@shared/types'
import { getDb } from '../db/connection'

function mapTerm(r: any): Term {
  return {
    id: r.id,
    academicYearId: r.academic_year_id,
    name: r.name,
    cycle: r.cycle,
    orderIndex: r.order_index,
    isCurrent: !!r.is_current
  }
}

export function registerTermHandlers(): void {
  ipcMain.handle(IPC.TERMS_LIST, (): ApiResult<Term[]> => {
    try {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM terms ORDER BY order_index').all() as any[]
      return { ok: true, data: rows.map(mapTerm) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
