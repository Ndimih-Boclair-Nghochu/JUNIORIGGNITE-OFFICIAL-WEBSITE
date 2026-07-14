import { app, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getDb, getDbFilePath, closeDb } from '../db/connection'

function backupsDir(): string {
  const dir = path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Creates a consistent snapshot of the encrypted DB. We run a WAL checkpoint
 * first so the -wal file is folded into the main db file, then copy it via
 * SQLite's online backup API (safe even while the app is running).
 */
export function createBackup(customPath?: string): string {
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = customPath ?? path.join(backupsDir(), `juniorignite-backup-${stamp}.db`)
  // better-sqlite3's backup() writes a transactionally-consistent copy.
  db.prepare(`VACUUM INTO ?`).run(dest)
  return dest
}

export async function createBackupWithDialog(): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: 'Save backup',
    defaultPath: `juniorignite-backup-${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'JuniorIgnite backup', extensions: ['db'] }]
  })
  if (result.canceled || !result.filePath) return null
  return createBackup(result.filePath)
}

export function listBackups(): { path: string; name: string; size: number; createdAt: string }[] {
  const dir = backupsDir()
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const full = path.join(dir, f)
      const stat = fs.statSync(full)
      return { path: full, name: f, size: stat.size, createdAt: stat.mtime.toISOString() }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Restores from a backup file. A safety copy of the current DB is taken first.
 * The DB connection is closed, the file swapped, and the app must reload for
 * the new DB to be opened (the caller relaunches).
 */
export async function restoreBackupWithDialog(): Promise<{ restored: boolean; from?: string }> {
  const result = await dialog.showOpenDialog({
    title: 'Restore from backup',
    properties: ['openFile'],
    filters: [{ name: 'JuniorIgnite backup', extensions: ['db'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return { restored: false }

  const source = result.filePaths[0]
  const dbPath = getDbFilePath()

  // Safety snapshot of current data before overwriting.
  createBackup(path.join(backupsDir(), `pre-restore-${Date.now()}.db`))

  closeDb()
  // Remove stale WAL/SHM sidecars so they don't shadow the restored file.
  for (const sidecar of ['-wal', '-shm']) {
    const p = dbPath + sidecar
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }
  fs.copyFileSync(source, dbPath)
  return { restored: true, from: source }
}
