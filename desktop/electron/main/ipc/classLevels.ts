import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult, ClassLevel } from '@shared/types'
import { getDb } from '../db/connection'
import { sessionManager } from '../session/sessionManager'
import { logActivity } from '../services/activityLog'

function mapLevel(r: any): ClassLevel {
  return { id: r.id, name: r.name, orderIndex: r.order_index, classCount: r.class_count ?? 0 }
}

const LEVEL_SELECT = `
  SELECT l.*, (SELECT COUNT(*) FROM classes c WHERE c.level_id = l.id) as class_count
  FROM class_levels l`

/**
 * One-time backfill for schools that existed before class levels: gives every
 * existing class its own level (named after the class, in alphabetical order) so
 * the promotion ladder starts from real data. The admin can then rename/reorder
 * levels and point several streams at the same level.
 */
export function ensureClassLevels(): void {
  const db = getDb()
  const levelCount = (db.prepare('SELECT COUNT(*) as n FROM class_levels').get() as { n: number }).n
  if (levelCount > 0) return
  const classes = db.prepare('SELECT id, name FROM classes ORDER BY name').all() as { id: number; name: string }[]
  if (classes.length === 0) return

  const run = db.transaction(() => {
    classes.forEach((c, i) => {
      const info = db.prepare('INSERT INTO class_levels (name, order_index) VALUES (?, ?)').run(c.name, i + 1)
      db.prepare('UPDATE classes SET level_id = ? WHERE id = ?').run(info.lastInsertRowid as number, c.id)
    })
  })
  run()
}

export function registerClassLevelHandlers(): void {
  ipcMain.handle(IPC.CLASS_LEVELS_LIST, (): ApiResult<ClassLevel[]> => {
    try {
      const db = getDb()
      const rows = db.prepare(`${LEVEL_SELECT} ORDER BY l.order_index, l.name`).all() as any[]
      return { ok: true, data: rows.map(mapLevel) }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(
    IPC.CLASS_LEVELS_CREATE,
    (_e, { name, orderIndex }: { name: string; orderIndex?: number }): ApiResult<ClassLevel> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const trimmed = String(name ?? '').trim()
        if (!trimmed) return { ok: false, error: 'Level name is required.' }
        const next =
          orderIndex ??
          ((db.prepare('SELECT COALESCE(MAX(order_index),0) as m FROM class_levels').get() as { m: number }).m + 1)
        const info = db.prepare('INSERT INTO class_levels (name, order_index) VALUES (?, ?)').run(trimmed, next)
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Created class level ${trimmed}`,
          entityType: 'classLevel',
          entityId: info.lastInsertRowid as number
        })
        const row = db.prepare(`${LEVEL_SELECT} WHERE l.id = ?`).get(info.lastInsertRowid as number)
        return { ok: true, data: mapLevel(row) }
      } catch (err: any) {
        if (String(err.message).includes('UNIQUE')) return { ok: false, error: 'A level with that name already exists.' }
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    IPC.CLASS_LEVELS_UPDATE,
    (_e, { id, name, orderIndex }: { id: number; name?: string; orderIndex?: number }): ApiResult<ClassLevel> => {
      try {
        const session = sessionManager.requireAdmin()
        const db = getDb()
        const current = db.prepare('SELECT * FROM class_levels WHERE id = ?').get(id) as any
        if (!current) return { ok: false, error: 'Level not found.' }
        db.prepare('UPDATE class_levels SET name = ?, order_index = ? WHERE id = ?').run(
          name?.trim() || current.name,
          orderIndex ?? current.order_index,
          id
        )
        logActivity({
          actorType: 'admin',
          actorLabel: session.username,
          action: `Updated class level ${name ?? current.name}`,
          entityType: 'classLevel',
          entityId: id
        })
        const row = db.prepare(`${LEVEL_SELECT} WHERE l.id = ?`).get(id)
        return { ok: true, data: mapLevel(row) }
      } catch (err: any) {
        if (String(err.message).includes('UNIQUE')) return { ok: false, error: 'A level with that name already exists.' }
        return { ok: false, error: err.message }
      }
    }
  )

  ipcMain.handle(IPC.CLASS_LEVELS_DELETE, (_e, { id }: { id: number }): ApiResult<null> => {
    try {
      const session = sessionManager.requireAdmin()
      const db = getDb()
      const level = db.prepare('SELECT * FROM class_levels WHERE id = ?').get(id) as any
      if (!level) return { ok: false, error: 'Level not found.' }
      const used = (db.prepare('SELECT COUNT(*) as n FROM classes WHERE level_id = ?').get(id) as { n: number }).n
      if (used > 0) return { ok: false, error: 'Cannot delete a level that still has classes assigned to it.' }
      db.prepare('DELETE FROM class_levels WHERE id = ?').run(id)
      logActivity({
        actorType: 'admin',
        actorLabel: session.username,
        action: `Deleted class level ${level.name}`,
        entityType: 'classLevel',
        entityId: id
      })
      return { ok: true, data: null }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
