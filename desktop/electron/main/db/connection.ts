import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import Database from 'better-sqlite3-multiple-ciphers'
import { runMigrations } from './migrate'

let dbInstance: Database.Database | null = null
let deviceIdCache: string | null = null
let lastIntegrityOk = true

function getUserDataDir(): string {
  const dir = app.getPath('userData')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Stable per-install identifier used to tag records for the sync/conflict logic. */
export function getDeviceId(): string {
  if (deviceIdCache) return deviceIdCache
  const file = path.join(getUserDataDir(), 'device.id')
  if (fs.existsSync(file)) {
    deviceIdCache = fs.readFileSync(file, 'utf-8').trim()
  } else {
    deviceIdCache = crypto.randomUUID()
    fs.writeFileSync(file, deviceIdCache, 'utf-8')
  }
  return deviceIdCache
}

/**
 * Loads (or creates) the 256-bit DB encryption key. The raw key is only ever
 * held in memory; at rest it is protected via Electron's safeStorage, which is
 * backed by the OS credential store (DPAPI on Windows, Keychain on macOS).
 */
function getOrCreateDbKeyHex(): string {
  const keyFile = path.join(getUserDataDir(), 'db.key.enc')

  if (fs.existsSync(keyFile)) {
    const encrypted = fs.readFileSync(keyFile)
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(encrypted).trim()
    }
    return encrypted.toString('utf-8').trim()
  }

  const rawKey = crypto.randomBytes(32).toString('hex')
  const toStore = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(rawKey)
    : Buffer.from(rawKey, 'utf-8')
  fs.writeFileSync(keyFile, toStore)
  return rawKey
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance

  const dbPath = path.join(getUserDataDir(), 'juniorignite.db')
  const keyHex = getOrCreateDbKeyHex()

  const db = new Database(dbPath)
  // Must be the very first statement executed against a fresh/encrypted file.
  db.pragma(`key="x'${keyHex}'"`)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  const integrity = db.pragma('integrity_check') as { integrity_check: string }[]
  lastIntegrityOk = integrity.length === 1 && integrity[0].integrity_check === 'ok'

  runMigrations(db)

  dbInstance = db
  return db
}

export function getIntegrityStatus(): { ok: boolean } {
  return { ok: lastIntegrityOk }
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.pragma('wal_checkpoint(TRUNCATE)')
    dbInstance.close()
    dbInstance = null
  }
}

export function getDbFilePath(): string {
  return path.join(getUserDataDir(), 'juniorignite.db')
}
