import type Database from 'better-sqlite3-multiple-ciphers'
import { MIGRATIONS } from './migrations/index'

/**
 * Very small forward-only migration runner: applies any migration whose
 * filename hasn't been recorded in schema_migrations yet, in array order,
 * each inside a transaction. Never edit a shipped migration — append a new one.
 */
export function runMigrations(db: Database.Database): { applied: string[] } {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const already = new Set(
    db
      .prepare('SELECT filename FROM schema_migrations')
      .all()
      .map((r: any) => r.filename)
  )

  const applied: string[] = []
  for (const { filename, sql } of MIGRATIONS) {
    if (already.has(filename)) continue
    const run = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(filename)
    })
    run()
    applied.push(filename)
  }

  return { applied }
}
